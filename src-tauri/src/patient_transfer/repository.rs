use anyhow::Result;
use rusqlite::{params, Connection};

pub struct PatientRow {
    pub display_name: String,
    pub clinical_notes: Option<String>,
    pub created_at: String,
    pub status: String,
    pub last_activity_at_ms: i64,
}

pub struct PresetRow {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub default_pose_frames_json: Option<String>,
}

pub struct MappingRow {
    pub name: String,
    pub created_at: String,
    pub keybind: String,
    pub keypress_type: String,
    pub pose_frames_json: String,
    pub selected_landmarks_json: String,
    pub threshold_percentage: u32,
    pub keypress_trigger_threshold_percentage: u32,
}

pub struct ScheduledSessionRow {
    pub scheduled_at_ms: i64,
    pub created_at_ms: i64,
}

pub fn select_patient_row(conn: &Connection, patient_id: &str) -> Result<PatientRow> {
    conn.query_row(
        "SELECT display_name, clinical_notes, created_at, status, last_activity_at_ms
         FROM patients WHERE id = ?1",
        params![patient_id],
        |row| {
            Ok(PatientRow {
                display_name: row.get(0)?,
                clinical_notes: row.get(1)?,
                created_at: row.get(2)?,
                status: row.get(3)?,
                last_activity_at_ms: row.get(4)?,
            })
        },
    )
    .map_err(Into::into)
}

pub fn select_presets_for_patient(conn: &Connection, patient_id: &str) -> Result<Vec<PresetRow>> {
    let mut statement = conn.prepare(
        "SELECT id, name, created_at, default_pose_frames_json FROM presets
         WHERE patient_id = ?1
         ORDER BY created_at",
    )?;

    let rows = statement
        .query_map(params![patient_id], |row| {
            Ok(PresetRow {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                default_pose_frames_json: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(rows)
}

pub fn select_mappings_for_preset(conn: &Connection, preset_id: &str) -> Result<Vec<MappingRow>> {
    let mut statement = conn.prepare(
        "SELECT name, created_at, keybind, keypress_type, pose_frames_json,
                selected_landmarks_json,
                threshold_percentage, keypress_trigger_threshold_percentage
         FROM movement_mappings
         WHERE preset_id = ?1
         ORDER BY created_at",
    )?;

    let rows = statement
        .query_map(params![preset_id], |row| {
            Ok(MappingRow {
                name: row.get(0)?,
                created_at: row.get(1)?,
                keybind: row.get(2)?,
                keypress_type: row.get(3)?,
                pose_frames_json: row.get(4)?,
                selected_landmarks_json: row.get(5)?,
                threshold_percentage: row.get(6)?,
                keypress_trigger_threshold_percentage: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(rows)
}

pub fn select_scheduled_sessions_for_patient(
    conn: &Connection,
    patient_id: &str,
) -> Result<Vec<ScheduledSessionRow>> {
    let mut statement = conn.prepare(
        "SELECT scheduled_at_ms, created_at_ms
         FROM scheduled_sessions
         WHERE patient_id = ?1
         ORDER BY scheduled_at_ms, created_at_ms, id",
    )?;

    let rows = statement
        .query_map(params![patient_id], |row| {
            Ok(ScheduledSessionRow {
                scheduled_at_ms: row.get(0)?,
                created_at_ms: row.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(rows)
}

pub struct NewMapping {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub keybind: String,
    pub keypress_type: String,
    pub pose_frames_json: String,
    pub selected_landmarks_json: String,
    pub threshold_percentage: u32,
    pub keypress_trigger_threshold_percentage: u32,
}

pub struct NewPreset {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub default_pose_frames_json: Option<String>,
    pub mappings: Vec<NewMapping>,
}

pub struct NewScheduledSession {
    pub id: String,
    pub scheduled_at_ms: i64,
    pub created_at_ms: i64,
}

pub struct NewPatientTree {
    pub patient_id: String,
    pub display_name: String,
    pub clinical_notes: Option<String>,
    pub created_at: String,
    pub status: String,
    pub last_activity_at_ms: i64,
    pub presets: Vec<NewPreset>,
    pub scheduled_sessions: Vec<NewScheduledSession>,
}

/// Inserts a patient and its full preset/mapping tree in a single transaction — either all of it
/// lands, or none of it does.
pub fn insert_patient_tree(conn: &mut Connection, tree: &NewPatientTree) -> Result<()> {
    let transaction = conn.transaction()?;

    transaction.execute(
        "INSERT INTO patients (
            id, display_name, clinical_notes, created_at, status, last_activity_at_ms
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            tree.patient_id,
            tree.display_name,
            tree.clinical_notes,
            tree.created_at,
            tree.status,
            tree.last_activity_at_ms
        ],
    )?;

    for preset in &tree.presets {
        transaction.execute(
            "INSERT INTO presets (id, patient_id, name, created_at, default_pose_frames_json)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                preset.id,
                tree.patient_id,
                preset.name,
                preset.created_at,
                preset.default_pose_frames_json
            ],
        )?;

        for mapping in &preset.mappings {
            transaction.execute(
                "INSERT INTO movement_mappings (
                    id, preset_id, name, keybind, keypress_type, pose_frames_json,
                    selected_landmarks_json, threshold_percentage,
                    keypress_trigger_threshold_percentage, created_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    mapping.id,
                    preset.id,
                    mapping.name,
                    mapping.keybind,
                    mapping.keypress_type,
                    mapping.pose_frames_json,
                    mapping.selected_landmarks_json,
                    mapping.threshold_percentage,
                    mapping.keypress_trigger_threshold_percentage,
                    mapping.created_at
                ],
            )?;
        }
    }

    for session in &tree.scheduled_sessions {
        transaction.execute(
            "INSERT INTO scheduled_sessions (
                id, patient_id, scheduled_at_ms, created_at_ms
             ) VALUES (?1, ?2, ?3, ?4)",
            params![
                session.id,
                tree.patient_id,
                session.scheduled_at_ms,
                session.created_at_ms
            ],
        )?;
    }

    transaction.commit()?;
    Ok(())
}
