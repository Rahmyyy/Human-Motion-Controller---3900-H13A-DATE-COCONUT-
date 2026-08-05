use anyhow::Result;
use rusqlite::{params, Connection};

pub struct PatientRow {
    pub display_name: String,
    pub clinical_notes: Option<String>,
}

pub struct PresetRow {
    pub id: String,
    pub name: String,
    pub default_pose_frames_json: Option<String>,
}

pub struct MappingRow {
    pub name: String,
    pub keybind: String,
    pub keypress_type: String,
    pub pose_frames_json: String,
    pub selected_landmarks_json: String,
    pub threshold_percentage: u32,
    pub keypress_trigger_threshold_percentage: u32,
}

pub fn select_patient_row(conn: &Connection, patient_id: &str) -> Result<PatientRow> {
    conn.query_row(
        "SELECT display_name, clinical_notes FROM patients WHERE id = ?1",
        params![patient_id],
        |row| {
            Ok(PatientRow {
                display_name: row.get(0)?,
                clinical_notes: row.get(1)?,
            })
        },
    )
    .map_err(Into::into)
}

pub fn select_presets_for_patient(conn: &Connection, patient_id: &str) -> Result<Vec<PresetRow>> {
    let mut statement = conn.prepare(
        "SELECT id, name, default_pose_frames_json FROM presets
         WHERE patient_id = ?1
         ORDER BY created_at",
    )?;

    let rows = statement
        .query_map(params![patient_id], |row| {
            Ok(PresetRow {
                id: row.get(0)?,
                name: row.get(1)?,
                default_pose_frames_json: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(rows)
}

pub fn select_mappings_for_preset(conn: &Connection, preset_id: &str) -> Result<Vec<MappingRow>> {
    let mut statement = conn.prepare(
        "SELECT name, keybind, keypress_type, pose_frames_json, selected_landmarks_json,
                threshold_percentage, keypress_trigger_threshold_percentage
         FROM movement_mappings
         WHERE preset_id = ?1
         ORDER BY created_at",
    )?;

    let rows = statement
        .query_map(params![preset_id], |row| {
            Ok(MappingRow {
                name: row.get(0)?,
                keybind: row.get(1)?,
                keypress_type: row.get(2)?,
                pose_frames_json: row.get(3)?,
                selected_landmarks_json: row.get(4)?,
                threshold_percentage: row.get(5)?,
                keypress_trigger_threshold_percentage: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(rows)
}

pub struct NewMapping {
    pub id: String,
    pub name: String,
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
    pub default_pose_frames_json: Option<String>,
    pub mappings: Vec<NewMapping>,
}

pub struct NewPatientTree {
    pub patient_id: String,
    pub display_name: String,
    pub clinical_notes: Option<String>,
    pub created_at: String,
    pub presets: Vec<NewPreset>,
}

/// Inserts a patient and its full preset/mapping tree in a single transaction — either all of it
/// lands, or none of it does.
pub fn insert_patient_tree(conn: &mut Connection, tree: &NewPatientTree) -> Result<()> {
    let transaction = conn.transaction()?;

    transaction.execute(
        "INSERT INTO patients (id, display_name, clinical_notes, created_at)
         VALUES (?1, ?2, ?3, ?4)",
        params![
            tree.patient_id,
            tree.display_name,
            tree.clinical_notes,
            tree.created_at
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
                tree.created_at,
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
                    tree.created_at
                ],
            )?;
        }
    }

    transaction.commit()?;
    Ok(())
}
