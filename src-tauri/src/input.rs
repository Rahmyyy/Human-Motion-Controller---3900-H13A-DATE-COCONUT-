use std::sync::Mutex;
use std::time::{Duration, Instant};

use enigo::{Direction, Enigo, Key, Keyboard, Settings};

const COOLDOWN: Duration = Duration::from_millis(100);

static LAST_FIRED: Mutex<Option<Instant>> = Mutex::new(None);

#[tauri::command]
pub fn press_key() {
    let mut last = LAST_FIRED.lock().unwrap();
    if let Some(t) = *last {
        if t.elapsed() < COOLDOWN {
            return;
        }
    }
    *last = Some(Instant::now());
    drop(last);

    let mut enigo = Enigo::new(&Settings::default()).unwrap();
    enigo.key(Key::Unicode('w'), Direction::Click).unwrap();
}
