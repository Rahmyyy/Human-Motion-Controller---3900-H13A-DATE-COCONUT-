use tauri::State;

use crate::{db::DbState, movement_mapping_service};

#[tauri::command]
pub fn create_movement_mapping(
    state: State<'_, DbState>,
    preset_id: String,
    name: String,
    keybind: String,
    pose_frames_json: String,
) -> Result<(), String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    movement_mapping_service::create_movement_mapping(
        &conn,
        &preset_id,
        &name,
        &keybind,
        &pose_frames_json,
    )
    .map_err(|error| error.to_string())
}
