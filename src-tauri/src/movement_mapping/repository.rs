use anyhow::Result;
use rusqlite::{params, Connection};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MovementMappingSummary {
    pub id: String,
    pub name: String,
    pub keybind: String,
    pub pose_frames_json: String,
    pub selected_landmarks: Vec<u32>,
    pub threshold_percentage: u32,
}

#[derive(serde::Serialize)]
pub struct MovementMappingDetails {
    pub id: String,
    pub preset_id: String,
    pub name: String,
    pub keybind: String,
    pub pose_frames_json: String,
    pub selected_landmarks: Vec<u32>,
    pub threshold_percentage: u32,
}

/// Decode the stored `selected_landmarks_json` column. An empty selection (stored as `[]`) is
/// treated as "all tracked landmarks" downstream.
fn parse_selected_landmarks(raw: String) -> Vec<u32> {
    serde_json::from_str::<Vec<u32>>(&raw).unwrap_or_default()
}

/// Column values for a new `movement_mappings` row, grouped so the insert takes one argument
/// instead of eight positional strings.
pub struct NewMovementMapping<'a> {
    pub id: &'a str,
    pub preset_id: &'a str,
    pub name: &'a str,
    pub keybind: &'a str,
    pub pose_frames_json: &'a str,
    pub selected_landmarks_json: &'a str,
    pub created_at: &'a str,
}

pub fn insert_movement_mapping(conn: &Connection, mapping: &NewMovementMapping) -> Result<()> {
    conn.execute(
        "
        INSERT INTO movement_mappings (
            id,
            preset_id,
            name,
            keybind,
            pose_frames_json,
            selected_landmarks_json,
            created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        ",
        params![
            mapping.id,
            mapping.preset_id,
            mapping.name,
            mapping.keybind,
            mapping.pose_frames_json,
            mapping.selected_landmarks_json,
            mapping.created_at
        ],
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
      SELECT id, name, keybind, pose_frames_json, selected_landmarks_json, threshold_percentage
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
                selected_landmarks: parse_selected_landmarks(row.get(4)?),
                threshold_percentage: row.get(5)?,
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
    selected_landmarks_json: &str,
) -> Result<usize> {
    let rows_affected = conn.execute(
        "
        UPDATE movement_mappings
        SET name = ?1, keybind = ?2, pose_frames_json = ?3, selected_landmarks_json = ?4
        WHERE id = ?5 AND preset_id = ?6
        ",
        params![
            name,
            keybind,
            pose_frames_json,
            selected_landmarks_json,
            id,
            preset_id
        ],
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

pub fn update_movement_mapping_threshold(
    conn: &Connection,
    id: &str,
    preset_id: &str,
    threshold_percentage: u32,
) -> Result<usize> {
    Ok(conn.execute(
        "
        UPDATE movement_mappings
        SET threshold_percentage = ?1
        WHERE id = ?2 AND preset_id = ?3
        ",
        params![threshold_percentage, id, preset_id],
    )?)
}

pub fn select_movement_mapping_by_id(
    conn: &Connection,
    id: &str,
    preset_id: &str,
) -> Result<MovementMappingDetails> {
    let mut statement = conn.prepare(
        "
        SELECT id, preset_id, name, keybind, pose_frames_json, selected_landmarks_json,
               threshold_percentage
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
            selected_landmarks: parse_selected_landmarks(row.get(5)?),
            threshold_percentage: row.get(6)?,
        })
    })?;

    Ok(mapping)
}
