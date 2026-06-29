use std::sync::Mutex;
use std::time::{Duration, Instant};

use enigo::{Direction, Enigo, Key, Keyboard, Settings};

const COOLDOWN: Duration = Duration::from_millis(100);

static LAST_FIRED: Mutex<Option<Instant>> = Mutex::new(None);

fn parse_key(key: &str) -> Result<Key, String> {
    let mut chars = key.chars();
    if let (Some(c), None) = (chars.next(), chars.next()) {
        return Ok(Key::Unicode(c));
    }
    match key {
        "Enter" => Ok(Key::Return),
        "Space" => Ok(Key::Space),
        "Escape" => Ok(Key::Escape),
        "Tab" => Ok(Key::Tab),
        "Backspace" => Ok(Key::Backspace),
        "ArrowUp" => Ok(Key::UpArrow),
        "ArrowDown" => Ok(Key::DownArrow),
        "ArrowLeft" => Ok(Key::LeftArrow),
        "ArrowRight" => Ok(Key::RightArrow),
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
    Ok(())
}
