use tauri::State;

use super::{
    repository::{MovementMappingDetails, MovementMappingSummary},
    service,
};
use crate::db::DbState;

#[tauri::command]
pub fn create_movement_mapping(
    state: State<'_, DbState>,
    preset_id: String,
    name: String,
    keybind: String,
    keypress_type: String,
    pose_frames_json: String,
    selected_landmarks: Vec<u32>,
    keypress_trigger_threshold_percentage: u32,
) -> Result<(), String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::create_movement_mapping(
        &conn,
        &preset_id,
        &name,
        &keybind,
        &keypress_type,
        &pose_frames_json,
        &selected_landmarks,
        keypress_trigger_threshold_percentage,
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_movement_mappings(
    state: State<'_, DbState>,
    preset_id: String,
) -> Result<Vec<MovementMappingSummary>, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::get_movement_mappings(&conn, &preset_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_movement_mapping(
    state: State<'_, DbState>,
    id: String,
    preset_id: String,
) -> Result<MovementMappingDetails, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::get_movement_mapping(&conn, &id, &preset_id).map_err(|error| error.to_string())
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn update_movement_mapping(
    state: State<'_, DbState>,
    id: String,
    preset_id: String,
    name: String,
    keybind: String,
    keypress_type: String,
    pose_frames_json: String,
    selected_landmarks: Vec<u32>,
    keypress_trigger_threshold_percentage: u32,
) -> Result<(), String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::update_movement_mapping(
        &conn,
        &service::MovementMappingUpdate {
            id: &id,
            preset_id: &preset_id,
            name: &name,
            keybind: &keybind,
            keypress_type: &keypress_type,
            pose_frames_json: &pose_frames_json,
            selected_landmarks: &selected_landmarks,
            keypress_trigger_threshold_percentage,
        },
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_movement_mapping(
    state: State<'_, DbState>,
    id: String,
    preset_id: String,
) -> Result<(), String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::delete_movement_mapping(&conn, &id, &preset_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_movement_mapping_threshold(
    state: State<'_, DbState>,
    id: String,
    preset_id: String,
    threshold_percentage: u32,
) -> Result<(), String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::update_movement_mapping_threshold(&conn, &id, &preset_id, threshold_percentage)
        .map_err(|error| error.to_string())
}
