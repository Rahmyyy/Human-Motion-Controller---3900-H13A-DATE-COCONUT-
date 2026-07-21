use tauri::State;

use super::{deletion, repository::Preset, service};

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

#[tauri::command]
pub fn duplicate_preset(state: State<'_, DbState>, id: String) -> Result<Preset, String> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::duplicate_preset(&mut conn, &id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_preset(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    deletion::delete_preset(&conn, &id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_default_pose(
    state: State<'_, DbState>,
    id: String,
    default_pose_frames_json: String,
) -> Result<Preset, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::update_default_pose(&conn, &id, &default_pose_frames_json)
        .map_err(|error| error.to_string())
}
