use anyhow::Result;
use rusqlite::{params, Connection};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Preset {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub mapping_count: i64,
    pub default_pose_frames_json: Option<String>,
}

pub fn insert_preset(conn: &Connection, id: &str, name: &str, created_at: &str) -> Result<()> {
    conn.execute(
        "
        INSERT INTO presets (
            id,
            name,
            created_at
        ) VALUES (?1, ?2, ?3)
        ",
        params![id, name, created_at],
    )?;

    Ok(())
}

pub fn duplicate_preset_data(
    conn: &mut Connection,
    source_id: &str,
    duplicate_id: &str,
    duplicate_name: &str,
    created_at: &str,
    default_pose_frames_json: Option<&str>,
) -> Result<()> {
    let transaction = conn.transaction()?;

    transaction.execute(
        "
        INSERT INTO presets (id, name, created_at, default_pose_frames_json)
        VALUES (?1, ?2, ?3, ?4)
        ",
        params![
            duplicate_id,
            duplicate_name,
            created_at,
            default_pose_frames_json
        ],
    )?;
    transaction.execute(
        "
        INSERT INTO movement_mappings (
            id, preset_id, name, keybind, pose_frames_json, created_at
        )
        SELECT
            ?1 || '-mapping-' || id,
            ?1,
            name,
            keybind,
            pose_frames_json,
            ?2
        FROM movement_mappings
        WHERE preset_id = ?3
        ",
        params![duplicate_id, created_at, source_id],
    )?;

    transaction.commit()?;
    Ok(())
}

pub fn select_presets(conn: &Connection) -> Result<Vec<Preset>> {
    let mut statement = conn.prepare(
        "
        SELECT presets.id, presets.name, presets.created_at, COUNT(movement_mappings.id),
               presets.default_pose_frames_json
        FROM presets
        LEFT JOIN movement_mappings ON movement_mappings.preset_id = presets.id
        GROUP BY presets.id, presets.name, presets.created_at, presets.default_pose_frames_json
        ORDER BY presets.created_at DESC
        ",
    )?;

    let presets = statement
        .query_map([], |row| {
            Ok(Preset {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                mapping_count: row.get(3)?,
                default_pose_frames_json: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(presets)
}

pub fn select_preset_by_id(conn: &Connection, id: &str) -> Result<Preset> {
    let mut statement = conn.prepare(
        "
        SELECT presets.id, presets.name, presets.created_at, COUNT(movement_mappings.id),
               presets.default_pose_frames_json
        FROM presets
        LEFT JOIN movement_mappings ON movement_mappings.preset_id = presets.id
        WHERE presets.id = ?1
        GROUP BY presets.id, presets.name, presets.created_at, presets.default_pose_frames_json
        ",
    )?;

    let preset = statement.query_row(params![id], |row| {
        Ok(Preset {
            id: row.get(0)?,
            name: row.get(1)?,
            created_at: row.get(2)?,
            mapping_count: row.get(3)?,
            default_pose_frames_json: row.get(4)?,
        })
    })?;

    Ok(preset)
}

pub fn delete_preset(conn: &Connection, id: &str) -> Result<usize> {
    let rows_affected = conn.execute("DELETE FROM presets WHERE id = ?1", params![id])?;
    Ok(rows_affected)
}

pub fn update_default_pose_frames(
    conn: &Connection,
    id: &str,
    default_pose_frames_json: &str,
) -> Result<usize> {
    let rows_affected = conn.execute(
        "
        UPDATE presets
        SET default_pose_frames_json = ?1
        WHERE id = ?2
        ",
        params![default_pose_frames_json, id],
    )?;

    Ok(rows_affected)
}
