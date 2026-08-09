use anyhow::Result;
use rusqlite::{params, Connection};

use super::model::Preset;

pub fn insert_preset(
    conn: &Connection,
    id: &str,
    patient_id: &str,
    name: &str,
    created_at: &str,
) -> Result<()> {
    conn.execute(
        "
        INSERT INTO presets (
            id,
            patient_id,
            name,
            created_at
        ) VALUES (?1, ?2, ?3, ?4)
        ",
        params![id, patient_id, name, created_at],
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
    patient_id: &str,
) -> Result<()> {
    let transaction = conn.transaction()?;

    transaction.execute(
        "
        INSERT INTO presets (id, patient_id, name, created_at, default_pose_frames_json)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ",
        params![
            duplicate_id,
            patient_id,
            duplicate_name,
            created_at,
            default_pose_frames_json
        ],
    )?;
    transaction.execute(
        "
        INSERT INTO movement_mappings (
            id, preset_id, name, keybind, keypress_type, pose_frames_json,
            selected_landmarks_json, threshold_percentage,
            keypress_trigger_threshold_percentage, created_at
        )
        SELECT
            ?1 || '-mapping-' || id,
            ?1,
            name,
            keybind,
            keypress_type,
            pose_frames_json,
            selected_landmarks_json,
            threshold_percentage,
            keypress_trigger_threshold_percentage,
            ?2
        FROM movement_mappings
        WHERE preset_id = ?3
        ",
        params![duplicate_id, created_at, source_id],
    )?;

    transaction.commit()?;
    Ok(())
}

pub fn select_presets_by_patient(conn: &Connection, patient_id: &str) -> Result<Vec<Preset>> {
    let mut statement = conn.prepare(
        "
        SELECT presets.id, presets.patient_id, presets.name, presets.created_at,
            COUNT(movement_mappings.id), presets.default_pose_frames_json
        FROM presets
        LEFT JOIN movement_mappings ON movement_mappings.preset_id = presets.id
        WHERE presets.patient_id = ?1
        GROUP BY presets.id, presets.patient_id, presets.name, presets.created_at,
                presets.default_pose_frames_json
        ORDER BY presets.created_at DESC
        ",
    )?;

    let presets = statement
        .query_map(params![patient_id], preset_from_row)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(presets)
}

pub fn select_preset_by_id(conn: &Connection, id: &str, patient_id: &str) -> Result<Preset> {
    let mut statement = conn.prepare(
        "
        SELECT presets.id, presets.patient_id, presets.name, presets.created_at,
            COUNT(movement_mappings.id), presets.default_pose_frames_json
        FROM presets
        LEFT JOIN movement_mappings ON movement_mappings.preset_id = presets.id
        WHERE presets.id = ?1 AND presets.patient_id = ?2
        GROUP BY presets.id, presets.patient_id, presets.name, presets.created_at,
                presets.default_pose_frames_json
        ",
    )?;

    let preset = statement.query_row(params![id, patient_id], preset_from_row)?;

    Ok(preset)
}

pub fn select_preset_by_id_any_patient(conn: &Connection, id: &str) -> Result<Preset> {
    let mut statement = conn.prepare(
        "
        SELECT presets.id, presets.patient_id, presets.name, presets.created_at,
            COUNT(movement_mappings.id), presets.default_pose_frames_json
        FROM presets
        LEFT JOIN movement_mappings ON movement_mappings.preset_id = presets.id
        WHERE presets.id = ?1
        GROUP BY presets.id, presets.patient_id, presets.name, presets.created_at,
                presets.default_pose_frames_json
        ",
    )?;

    Ok(statement.query_row(params![id], preset_from_row)?)
}

pub fn delete_preset(conn: &Connection, id: &str) -> Result<usize> {
    let rows_affected = conn.execute("DELETE FROM presets WHERE id = ?1", params![id])?;
    Ok(rows_affected)
}

pub fn update_default_pose_frames(
    conn: &Connection,
    id: &str,
    patient_id: &str,
    default_pose_frames_json: &str,
) -> Result<usize> {
    let rows_affected = conn.execute(
        "
        UPDATE presets
        SET default_pose_frames_json = ?1
        WHERE id = ?2 AND patient_id = ?3
        ",
        params![default_pose_frames_json, id, patient_id],
    )?;

    Ok(rows_affected)
}

fn preset_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Preset> {
    Ok(Preset {
        id: row.get(0)?,
        patient_id: row.get(1)?,
        name: row.get(2)?,
        created_at: row.get(3)?,
        mapping_count: row.get(4)?,
        default_pose_frames_json: row.get(5)?,
    })
}
