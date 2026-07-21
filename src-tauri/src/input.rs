use std::sync::Mutex;
use std::time::{Duration, Instant};

use enigo::{Direction, Enigo, Key, Keyboard, Settings};

const COOLDOWN: Duration = Duration::from_millis(100);

static LAST_FIRED: Mutex<Option<Instant>> = Mutex::new(None);

fn parse_key(key: &str) -> Result<Key, String> {
    let mut chars = key.chars();
    if let (Some(c), None) = (chars.next(), chars.next()) {
        // Lowercased on purpose. enigo resolves a char with VkKeyScanExW but
        // keeps the whole return value, including the shift state Windows packs
        // into the high byte -- 'L' becomes 0x014C rather than VK_L (0x4C).
        // That maps to no scan code, so the keypress goes out malformed and no
        // application receives it. There is no separate "uppercase" key, so
        // dropping the shift state is also the correct thing to press.
        return Ok(Key::Unicode(c.to_ascii_lowercase()));
    }
    match key {
        "Enter" | "Return" => Ok(Key::Return),
        "Space" | "Spacebar" => Ok(Key::Space),
        "Escape" | "Esc" => Ok(Key::Escape),
        "Tab" => Ok(Key::Tab),
        "Backspace" => Ok(Key::Backspace),
        "ArrowUp" | "Arrow Up" => Ok(Key::UpArrow),
        "ArrowDown" | "Arrow Down" => Ok(Key::DownArrow),
        "ArrowLeft" | "Arrow Left" => Ok(Key::LeftArrow),
        "ArrowRight" | "Arrow Right" => Ok(Key::RightArrow),
        "F1" => Ok(Key::F1),
        "F2" => Ok(Key::F2),
        "F3" => Ok(Key::F3),
        "F4" => Ok(Key::F4),
        "F5" => Ok(Key::F5),
        "F6" => Ok(Key::F6),
        "F7" => Ok(Key::F7),
        "F8" => Ok(Key::F8),
        "F9" => Ok(Key::F9),
        "F10" => Ok(Key::F10),
        "F11" => Ok(Key::F11),
        "F12" => Ok(Key::F12),
        _ => Err(format!("unknown key: {key}")),
    }
}

#[tauri::command]
pub fn press_key(key: String) -> Result<(), String> {
    let mut last = LAST_FIRED.lock().map_err(|e| e.to_string())?;
    if let Some(t) = *last {
        if t.elapsed() < COOLDOWN {
            log::info!("press_key: '{key}' skipped, still within cooldown");
            return Ok(());
        }
    }
    *last = Some(Instant::now());
    drop(last);

    let enigo_key = parse_key(&key)?;
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    enigo
        .key(enigo_key, Direction::Click)
        .map_err(|e| e.to_string())?;

    // Logged so a "the game isn't responding" report can be split into
    // "no press was ever sent" vs "the press was sent but went elsewhere",
    // which have completely different causes.
    log::info!("press_key: sent '{key}' as {enigo_key:?} to the foreground window");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_an_uppercase_letter_to_the_unshifted_key() {
        // Regression: an uppercase char makes enigo produce a virtual key with
        // the shift state still in the high byte, which maps to no scan code
        // and silently sends a keypress no application can receive.
        assert_eq!(parse_key("L"), Ok(Key::Unicode('l')));
    }

    #[test]
    fn leaves_already_lowercase_and_digit_keys_alone() {
        assert_eq!(parse_key("w"), Ok(Key::Unicode('w')));
        assert_eq!(parse_key("4"), Ok(Key::Unicode('4')));
    }

    #[test]
    fn maps_named_keys() {
        assert_eq!(parse_key("Space"), Ok(Key::Space));
        assert_eq!(parse_key("ArrowUp"), Ok(Key::UpArrow));
    }

    #[test]
    fn rejects_an_unknown_named_key() {
        assert!(parse_key("Nonsense").is_err());
    }
}
