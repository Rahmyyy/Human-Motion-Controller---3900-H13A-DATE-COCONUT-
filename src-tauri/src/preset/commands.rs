use tauri::State;

use super::{repository::Preset, service};

use crate::db::DbState;

#[tauri::command]
pub fn create_preset(state: State<'_, DbState>, name: String) -> Result<Preset, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::create_preset(&conn, &name).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_presets(state: State<'_, DbState>) -> Result<Vec<Preset>, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::get_presets(&conn).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_preset(state: State<'_, DbState>, id: String) -> Result<Preset, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::get_preset(&conn, &id).map_err(|error| error.to_string())
}
