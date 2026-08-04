use tauri::State;

use super::service;

use crate::{
    db::DbState,
    native::{contract::PresetDto, error::NativeError},
};

#[tauri::command]
pub fn create_preset(
    state: State<'_, DbState>,
    patient_id: String,
    name: String,
) -> Result<PresetDto, NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::create_preset(&conn, &patient_id, &name)
        .map(PresetDto::from)
        .map_err(|error| NativeError::operation("preset_create_failed", error))
}

#[tauri::command]
pub fn get_presets(
    state: State<'_, DbState>,
    patient_id: String,
) -> Result<Vec<PresetDto>, NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::get_presets(&conn, &patient_id)
        .map(|presets| presets.into_iter().map(PresetDto::from).collect())
        .map_err(|error| NativeError::operation("preset_list_failed", error))
}

#[tauri::command]
pub fn get_preset(
    state: State<'_, DbState>,
    id: String,
    patient_id: String,
) -> Result<PresetDto, NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::get_preset(&conn, &id, &patient_id)
        .map(PresetDto::from)
        .map_err(|error| NativeError::operation("preset_get_failed", error))
}

#[tauri::command]
pub fn duplicate_preset(state: State<'_, DbState>, id: String) -> Result<PresetDto, NativeError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::duplicate_preset(&mut conn, &id)
        .map(PresetDto::from)
        .map_err(|error| NativeError::operation("preset_duplicate_failed", error))
}

#[tauri::command]
pub fn delete_preset(state: State<'_, DbState>, id: String) -> Result<(), NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::delete_preset(&conn, &id)
        .map_err(|error| NativeError::operation("preset_delete_failed", error))
}

#[tauri::command]
pub fn update_default_pose(
    state: State<'_, DbState>,
    id: String,
    patient_id: String,
    default_pose_frames_json: String,
) -> Result<PresetDto, NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::update_default_pose(&conn, &id, &patient_id, &default_pose_frames_json)
        .map(PresetDto::from)
        .map_err(|error| NativeError::operation("preset_default_pose_update_failed", error))
}
