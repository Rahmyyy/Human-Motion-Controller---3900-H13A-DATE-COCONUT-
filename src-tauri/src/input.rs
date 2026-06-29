use std::sync::Mutex;
use std::time::{Duration, Instant};

use enigo::{Direction, Enigo, Key, Keyboard, Settings};

const COOLDOWN: Duration = Duration::from_millis(100);

static LAST_FIRED: Mutex<Option<Instant>> = Mutex::new(None);

#[tauri::command]
pub fn press_key() -> Result<(), String> {
    let mut last = LAST_FIRED.lock().map_err(|e| e.to_string())?;
    if let Some(t) = *last {
        if t.elapsed() < COOLDOWN {
            return Ok(());
        }
    }
    *last = Some(Instant::now());
    drop(last);

    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    enigo
        .key(Key::Unicode('w'), Direction::Click)
        .map_err(|e| e.to_string())?;
    Ok(())
}
