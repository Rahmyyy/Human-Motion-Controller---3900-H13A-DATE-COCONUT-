use crate::movement_mapping_repository::{self, MovementMappingSummary};
use anyhow::{anyhow, Result};
use rusqlite::Connection;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn get_movement_mappings(
    conn: &Connection,
    preset_id: &str,
) -> Result<Vec<MovementMappingSummary>> {
    movement_mapping_repository::select_movement_mappings_by_preset(conn, preset_id)
}

pub fn create_movement_mapping(
    conn: &Connection,
    preset_id: &str,
    name: &str,
    keybind: &str,
    pose_frames_json: &str,
) -> Result<()> {
    let name = name.trim();
    let keybind = keybind.trim();

    if name.is_empty() {
        return Err(anyhow!("Movement mapping name cannot be empty"));
    }

    if keybind.is_empty() {
        return Err(anyhow!("Movement mapping keybind cannot be empty"));
    }

    if pose_frames_json.trim().is_empty() {
        return Err(anyhow!("Movement mapping pose frames cannot be empty"));
    }

    let now = SystemTime::now().duration_since(UNIX_EPOCH)?;
    let id = format!("movement-mapping-{}", now.as_nanos());
    let created_at = now.as_secs().to_string();

    movement_mapping_repository::insert_movement_mapping(
        conn,
        &id,
        preset_id,
        name,
        keybind,
        pose_frames_json,
        &created_at,
    )?;

    Ok(())
}
