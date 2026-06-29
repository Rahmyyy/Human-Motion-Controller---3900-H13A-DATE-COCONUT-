use anyhow::Result;
use rusqlite::{params, Connection};

pub fn insert_movement_mapping(
    conn: &Connection,
    id: &str,
    preset_id: &str,
    name: &str,
    keybind: &str,
    pose_frames_json: &str,
    created_at: &str,
) -> Result<()> {
    conn.execute(
        "
        INSERT INTO movement_mappings (
            id,
            preset_id,
            name,
            keybind,
            pose_frames_json,
            created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ",
        params![id, preset_id, name, keybind, pose_frames_json, created_at],
    )?;

    Ok(())
}
