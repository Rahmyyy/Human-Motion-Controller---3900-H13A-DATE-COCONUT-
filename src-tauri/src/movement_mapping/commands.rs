use tauri::State;

use super::service;
use crate::{
    db::DbState,
    native::{
        contract::{MovementMappingDetailsDto, MovementMappingSummaryDto},
        error::NativeError,
    },
};

#[allow(clippy::too_many_arguments)]
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
) -> Result<(), NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

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
    .map_err(|error| NativeError::operation("movement_mapping_create_failed", error))
}

#[tauri::command]
pub fn get_movement_mappings(
    state: State<'_, DbState>,
    preset_id: String,
) -> Result<Vec<MovementMappingSummaryDto>, NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::get_movement_mappings(&conn, &preset_id)
        .map(|mappings| {
            mappings
                .into_iter()
                .map(MovementMappingSummaryDto::from)
                .collect()
        })
        .map_err(|error| NativeError::operation("movement_mapping_list_failed", error))
}

#[tauri::command]
pub fn get_movement_mapping(
    state: State<'_, DbState>,
    id: String,
    preset_id: String,
) -> Result<MovementMappingDetailsDto, NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::get_movement_mapping(&conn, &id, &preset_id)
        .map(MovementMappingDetailsDto::from)
        .map_err(|error| NativeError::operation("movement_mapping_get_failed", error))
}

#[allow(clippy::too_many_arguments)]
#[tauri::command]
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
) -> Result<(), NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

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
    .map_err(|error| NativeError::operation("movement_mapping_update_failed", error))
}

#[tauri::command]
pub fn delete_movement_mapping(
    state: State<'_, DbState>,
    id: String,
    preset_id: String,
) -> Result<(), NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::delete_movement_mapping(&conn, &id, &preset_id)
        .map_err(|error| NativeError::operation("movement_mapping_delete_failed", error))
}

#[tauri::command]
pub fn update_movement_mapping_threshold(
    state: State<'_, DbState>,
    id: String,
    preset_id: String,
    threshold_percentage: u32,
) -> Result<(), NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::update_movement_mapping_threshold(&conn, &id, &preset_id, threshold_percentage)
        .map_err(|error| NativeError::operation("movement_mapping_threshold_update_failed", error))
}
