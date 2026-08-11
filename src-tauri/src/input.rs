mod action;
mod backend;

pub use action::PressType;

use action::{Action, InputBackend};

/// Sends one complete key click through the native input backend.
#[tauri::command]
pub fn press_key(key: String) -> Result<(), String> {
    let mut backend = backend::request_enigo()?;
    execute_with(&mut *backend, &key, PressType::Click)
}

/// Sends the requested keyboard or mouse action through the native input backend.
#[tauri::command]
pub fn execute_action(key: String, press_type: PressType) -> Result<(), String> {
    let mut backend = backend::request_enigo()?;
    execute_with(&mut *backend, &key, press_type)
}

fn execute_with<B: InputBackend>(
    backend: &mut B,
    key: &str,
    press_type: PressType,
) -> Result<(), String> {
    Action::from_raw_str(key, press_type)?.execute(backend)
}

/// Initialises the real operating-system input adapter during Tauri startup.
pub fn init_action_backend() -> Result<(), ()> {
    backend::init_action_backend()
}

#[cfg(test)]
mod tests;
