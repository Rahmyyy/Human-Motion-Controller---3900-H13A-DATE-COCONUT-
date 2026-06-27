use enigo::{Direction, Enigo, Key, Keyboard, Settings};

#[tauri::command]
pub fn press_key() {
    let mut enigo = Enigo::new(&Settings::default()).unwrap();
    enigo.key(Key::Unicode('w'), Direction::Click).unwrap();
}
