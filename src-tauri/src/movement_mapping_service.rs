use crate::movement_mapping_repository;
use anyhow::{anyhow, Result};
use rusqlite::Connection;

pub fn create_movement_mapping(
    conn: &Connection,
    preset_id: &str,
    name: &str,
    keybind: &str,
    pose_frames_json: &str,
) -> Result<()> {
    if name.trim().is_empty() {
        return Err(anyhow!("Movement mapping name cannot be empty"));
    }

    if keybind.trim().is_empty() {
        return Err(anyhow!("Movement mapping keybind cannot be empty"));
    }

    movement_mapping_repository::insert_movement_mapping(
        conn,
        "fake_id_for_now",
        preset_id,
        name,
        keybind,
        pose_frames_json,
        "fake_timestamp_for_now",
    )?;

    Ok(())
}
