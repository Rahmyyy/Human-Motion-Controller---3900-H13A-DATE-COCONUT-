use enigo::{Button, Direction, Key};
use log::error;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord, Deserialize, Serialize)]
pub enum PressType {
    Toggle,
    Press,
    Release,
    Click,
}

impl PressType {
    pub(super) fn to_direction(&self, pressed: bool) -> Direction {
        match (self, pressed) {
            (PressType::Toggle, false) | (PressType::Press, _) => Direction::Press,
            (PressType::Toggle, true) | (PressType::Release, _) => Direction::Release,
            (PressType::Click, _) => Direction::Click,
        }
    }
}

#[derive(Debug, Clone, Deserialize, Eq, PartialEq, Hash)]
pub(super) enum Action {
    Keyboard(Key, PressType),
    MouseButton(Button, PressType),
}

pub(super) trait InputBackend {
    fn key_is_pressed(&mut self, key: Key) -> bool;
    fn send_key(&mut self, key: Key, direction: Direction) -> Result<(), String>;
    fn send_button(&mut self, button: Button, direction: Direction) -> Result<(), String>;
}

impl Action {
    pub(super) fn from_raw_str(key_str: &str, press_type: PressType) -> Result<Self, String> {
        let mut chars = key_str.chars();
        if let (Some(character), None) = (chars.next(), chars.next()) {
            return Ok(Action::Keyboard(
                Key::Unicode(character.to_ascii_lowercase()),
                press_type,
            ));
        }

        if let Some(key) = named_key(key_str) {
            return Ok(Action::Keyboard(key, press_type));
        }

        if let Some(button) = named_button(key_str) {
            return Ok(Action::MouseButton(button, press_type));
        }

        let error = format!("Unknown key: {key_str}");
        error!("{error}");
        Err(error)
    }

    pub(super) fn execute<B: InputBackend>(&self, backend: &mut B) -> Result<(), String> {
        match self {
            Action::Keyboard(key, press_type) => {
                let direction = press_type.to_direction(backend.key_is_pressed(*key));
                backend.send_key(*key, direction)
            }
            Action::MouseButton(_, PressType::Toggle) => {
                let error = "Toggle mouse button not available".to_string();
                error!("{error}");
                Err(error)
            }
            Action::MouseButton(button, press_type) => {
                backend.send_button(*button, press_type.to_direction(false))
            }
        }
    }
}

fn named_key(key_str: &str) -> Option<Key> {
    match key_str {
        "Enter" | "Return" => Some(Key::Return),
        "Space" | "Spacebar" => Some(Key::Space),
        "Escape" | "Esc" => Some(Key::Escape),
        "Tab" => Some(Key::Tab),
        "Backspace" => Some(Key::Backspace),
        "ArrowUp" | "Arrow Up" => Some(Key::UpArrow),
        "ArrowDown" | "Arrow Down" => Some(Key::DownArrow),
        "ArrowLeft" | "Arrow Left" => Some(Key::LeftArrow),
        "ArrowRight" | "Arrow Right" => Some(Key::RightArrow),
        _ => serde_json::from_str::<Key>(&format!("\"{key_str}\"")).ok(),
    }
}

fn named_button(key_str: &str) -> Option<Button> {
    match key_str {
        "MouseLeft" | "Mouse Left" => Some(Button::Left),
        "MouseRight" | "Mouse Right" => Some(Button::Right),
        "MouseMiddle" | "Mouse Middle" => Some(Button::Middle),
        _ => serde_json::from_str::<Button>(&format!("\"{key_str}\"")).ok(),
    }
}
