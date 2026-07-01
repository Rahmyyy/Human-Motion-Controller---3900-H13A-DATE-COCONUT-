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
            pose_frames_json: row.get(4)?
        })
    })?;

    Ok(mapping)
}
