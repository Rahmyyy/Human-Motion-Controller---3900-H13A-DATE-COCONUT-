use enigo::{Button, Direction, Enigo, Key, Keyboard, Mouse};
use log::{error, info};
use serde::{Deserialize, Serialize};
use std::sync::{Mutex, MutexGuard, OnceLock};

static ENIGO_HANDLER: OnceLock<Mutex<Enigo>> = OnceLock::new();

#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord, Deserialize, Serialize)]
pub enum PressType {
    Toggle,
    Press,
    Release,
    Click, // Press and relase immediately
}

impl PressType {
    fn to_direction(&self, pressed: bool) -> Direction {
        match (self, pressed) {
            (PressType::Toggle, false) | (PressType::Press, _) => Direction::Press,
            (PressType::Toggle, true) | (PressType::Release, _) => Direction::Release,
            (PressType::Click, _) => Direction::Click,
        }
    }
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq, Hash)]
pub enum Action {
    Keyboard(Key, PressType),
    MouseButton(Button, PressType),
}

impl Action {
    fn from_raw_str(key_str: &str, press_type: PressType) -> Result<Self, String> {
        // Implementation for parsing key
        let mut chars = key_str.chars();
        if let (Some(c), None) = (chars.next(), chars.next()) {
            return Ok(Action::Keyboard(
                Key::Unicode(c.to_ascii_lowercase()),
                press_type,
            ));
        }

        if let Some(key) = match key_str {
            "Enter" | "Return" => Some(Key::Return),
            "Space" | "Spacebar" => Some(Key::Space),
            "Escape" | "Esc" => Some(Key::Escape),
            "Tab" => Some(Key::Tab),
            "Backspace" => Some(Key::Backspace),
            "ArrowUp" | "Arrow Up" => Some(Key::UpArrow),
            "ArrowDown" | "Arrow Down" => Some(Key::DownArrow),
            "ArrowLeft" | "Arrow Left" => Some(Key::LeftArrow),
            "ArrowRight" | "Arrow Right" => Some(Key::RightArrow),
            _ => serde_json::from_str::<Key>(&format!("\"{}\"", key_str)).ok(),
        } {
            return Ok(Action::Keyboard(key, press_type));
        }

        if let Some(key) = match key_str {
            "MouseLeft" | "Mouse Left" => Some(Button::Left),
            "MouseRight" | "Mouse Right" => Some(Button::Right),
            "MouseMiddle" | "Mouse Middle" => Some(Button::Middle),
            _ => serde_json::from_str::<Button>(&format!("\"{}\"", key_str)).ok(),
        } {
            return Ok(Action::MouseButton(key, press_type));
        }

        let err_str = format!("Unknown key: {}", key_str);

        error!("{}", err_str);
        Err(err_str)
    }

    fn get_key_state(&self, enigo: &mut Enigo) -> Option<bool> {
        // True if pressed, false if not, None if not a keypress relatede action (for future if we do mouse control)
        let held_keys = enigo.held().0;

        match self {
            Action::Keyboard(key, _) => Some(held_keys.contains(key)),
            _ => None, // Not sure if check is possible for mouse -> toggling mouse not possible then
        }
    }

    fn execute(&self, enigo: &mut Enigo) {
        match self {
            Action::Keyboard(key, press_type) => {
                let is_pressed = self.get_key_state(enigo).unwrap();
                let direction = press_type.to_direction(is_pressed);
                let _ = enigo.key(*key, direction);
            }
            Action::MouseButton(button, press_type) => {
                if matches!(press_type, PressType::Toggle) {
                    error!("Toggle mouse button not available");
                    return;
                }

                let direction = press_type.to_direction(false);
                let _ = enigo.button(*button, direction);
            }
        }
    }
}

fn request_enigo() -> Result<MutexGuard<'static, Enigo>, String> {
    match ENIGO_HANDLER.get() {
        Some(mutex) => Ok(mutex.lock().map_err(|e| e.to_string())?),
        None => {
            error!("Enigo backend uninitialised");
            Err("Enigo backend uninitialised".to_string())
        }
    }
}

#[tauri::command]
pub fn press_key(key: String) -> Result<(), String> {
    let mut enigo = request_enigo()?;

    Action::from_raw_str(&key, PressType::Click)?.execute(&mut enigo);

    Ok(())
}

#[tauri::command]
pub fn execute_action(key: String, press_type: PressType) -> Result<(), String> {
    let mut enigo = request_enigo()?;

    Action::from_raw_str(&key, press_type)?.execute(&mut enigo);

    Ok(())
}

pub fn init_action_backend() {
    let mut settings = enigo::Settings::default();

    let enigo = loop {
        info!("Attempting to initialize enigo backend...");
        match Enigo::new(&settings) {
            Ok(x) => break x,
            Err(e) => {
                error!("Failed to initialize enigo: {}", e);
            }
        }

        settings = enigo::Settings {
            // So on mac it doesn't spam the permssion prompt
            open_prompt_to_get_permissions: false,
            ..enigo::Settings::default()
        };
        std::thread::sleep(std::time::Duration::from_secs(1));
    };

    match ENIGO_HANDLER.get() {
        Some(mutex) => {
            info!("Re-initialised enigo backend");
            *mutex.lock().unwrap() = enigo;
        }
        None => {
            info!("Initialised enigo backend");
            let _ = ENIGO_HANDLER.set(Mutex::new(enigo));
        }
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_an_uppercase_letter_to_the_unshifted_key() {
        // Regression: an uppercase char makes enigo produce a virtual key with
        // the shift state still in the high byte, which maps to no scan code
        // and silently sends a keypress no application can receive.
        assert_eq!(
            Action::from_raw_str("L", PressType::Click),
            Ok(Action::Keyboard(Key::Unicode('l'), PressType::Click))
        );
    }

    #[test]
    fn leaves_already_lowercase_and_digit_keys_alone() {
        assert_eq!(
            Action::from_raw_str("w", PressType::Click),
            Ok(Action::Keyboard(Key::Unicode('w'), PressType::Click))
        );
        assert_eq!(
            Action::from_raw_str("4", PressType::Click),
            Ok(Action::Keyboard(Key::Unicode('4'), PressType::Click))
        );
    }

    #[test]
    fn maps_named_keys() {
        assert_eq!(
            Action::from_raw_str("Space", PressType::Click),
            Ok(Action::Keyboard(Key::Space, PressType::Click))
        );
        assert_eq!(
            Action::from_raw_str("ArrowUp", PressType::Click),
            Ok(Action::Keyboard(Key::UpArrow, PressType::Click))
        );
    }

    #[test]
    fn rejects_an_unknown_named_key() {
        assert!(Action::from_raw_str("Nonsense", PressType::Click).is_err());
    }
}
