use tauri::State;

use super::{repository::Preset, service};

use crate::db::DbState;

#[tauri::command]
pub fn create_preset(
    state: State<'_, DbState>,
    patient_id: String,
    name: String,
) -> Result<Preset, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::create_preset(&conn, &patient_id, &name).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_presets(state: State<'_, DbState>, patient_id: String) -> Result<Vec<Preset>, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::get_presets(&conn, &patient_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_preset(
    state: State<'_, DbState>,
    id: String,
    patient_id: String,
) -> Result<Preset, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::get_preset(&conn, &id, &patient_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_default_pose(
    state: State<'_, DbState>,
    id: String,
    patient_id: String,
    default_pose_frames_json: String,
) -> Result<Preset, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::update_default_pose(&conn, &id, &patient_id, &default_pose_frames_json)
        .map_err(|error| error.to_string())
}
