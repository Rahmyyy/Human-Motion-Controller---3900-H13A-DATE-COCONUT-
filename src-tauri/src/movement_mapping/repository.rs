use anyhow::Result;
use rusqlite::{params, Connection};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MovementMappingSummary {
    pub id: String,
    pub name: String,
    pub keybind: String,
    pub pose_frames_json: String,
}

#[derive(serde::Serialize)]
pub struct MovementMappingDetails {
    pub id: String,
    pub preset_id: String,
    pub name: String,
    pub keybind: String,
    pub pose_frames_json: String,
}

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

pub fn preset_has_default_pose(conn: &Connection, preset_id: &str) -> Result<bool> {
    let has_default_pose = conn.query_row(
        "
        SELECT EXISTS(
            SELECT 1
            FROM presets
            WHERE id = ?1 AND default_pose_frames_json IS NOT NULL
        )
        ",
        params![preset_id],
        |row| row.get(0),
    )?;

    Ok(has_default_pose)
}

pub fn select_movement_mappings_by_preset(
    conn: &Connection,
    preset_id: &str,
) -> Result<Vec<MovementMappingSummary>> {
    let mut statement = conn.prepare(
        "
      SELECT id, name, keybind, pose_frames_json
      FROM movement_mappings
      WHERE preset_id = ?1
      ORDER BY created_at DESC
      ",
    )?;

    let mappings = statement
        .query_map(params![preset_id], |row| {
            Ok(MovementMappingSummary {
                id: row.get(0)?,
                name: row.get(1)?,
                keybind: row.get(2)?,
                pose_frames_json: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(mappings)
}

pub fn update_movement_mapping(
    conn: &Connection,
    id: &str,
    preset_id: &str,
    name: &str,
    keybind: &str,
    pose_frames_json: &str,
) -> Result<usize> {
    let rows_affected = conn.execute(
        "
        UPDATE movement_mappings
        SET name = ?1, keybind = ?2, pose_frames_json = ?3
        WHERE id = ?4 AND preset_id = ?5
        ",
        params![name, keybind, pose_frames_json, id, preset_id],
    )?;

    Ok(rows_affected)
}

pub fn delete_movement_mapping(conn: &Connection, id: &str, preset_id: &str) -> Result<usize> {
    let rows_affected = conn.execute(
        "
        DELETE FROM movement_mappings
        WHERE id = ?1 AND preset_id = ?2
        ",
        params![id, preset_id],
    )?;

    Ok(rows_affected)
}

pub fn select_movement_mapping_by_id(
    conn: &Connection,
    id: &str,
    preset_id: &str,
) -> Result<MovementMappingDetails> {
    let mut statement = conn.prepare(
        "
        SELECT id, preset_id, name, keybind, pose_frames_json
        FROM movement_mappings
        WHERE id = ?1 AND preset_id = ?2
        ",
    )?;

    let mapping = statement.query_row(params![id, preset_id], |row| {
        Ok(MovementMappingDetails {
            id: row.get(0)?,
            preset_id: row.get(1)?,
            name: row.get(2)?,
            keybind: row.get(3)?,
            pose_frames_json: row.get(4)?,
        })
    })?;

    Ok(mapping)
}
