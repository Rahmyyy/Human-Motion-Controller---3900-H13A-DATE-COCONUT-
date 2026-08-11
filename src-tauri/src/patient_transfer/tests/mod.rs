mod commands;
mod export;
mod format_patient;
mod format_preset;
mod format_session;
mod history;
mod import;
mod import_errors;
mod repository;
mod repository_rows;
mod round_trip;

use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::Connection;
use serde_json::{json, Value};

use super::format;

/// `setup_test_conn` seeds `patient-1` / `preset-1` with an empty default pose, which isn't a
/// valid (>= 2 frame) pose on its own — top it up and attach one mapping, one scheduled session
/// and one completed session so the source patient has a realistic, exportable tree.
fn seed_source_patient(conn: &Connection) {
    conn.execute_batch(
        r#"
        UPDATE patients
        SET clinical_notes = 'Mobility programme',
            status = 'needsReview',
            last_activity_at_ms = 4242
        WHERE id = 'patient-1';

        UPDATE presets
        SET default_pose_frames_json = '[{"t":0},{"t":33}]'
        WHERE id = 'preset-1';

        INSERT INTO scheduled_sessions (id, patient_id, scheduled_at_ms, created_at_ms)
        VALUES ('session-1', 'patient-1', 3000, 2000);

        INSERT INTO movement_mappings (
            id, preset_id, name, keybind, keypress_type, pose_frames_json,
            selected_landmarks_json, threshold_percentage,
            keypress_trigger_threshold_percentage, created_at
        ) VALUES (
            'mapping-1', 'preset-1', 'Arm Raise', 'W', 'Click', '[{"t":0},{"t":33}]',
            '[11,12]', 90, 70, '1'
        );

        INSERT INTO sessions (
            id, patient_id, preset_id, preset_name, started_at_ms, ended_at_ms,
            duration_ms, trigger_count
        ) VALUES (
            'completed-session-1', 'patient-1', 'preset-1', 'Test Preset',
            10000, 16000, 6000, 3
        );

        INSERT INTO session_mapping_stats (
            session_id, mapping_id, mapping_name, keybind, threshold_percentage,
            keypress_trigger_threshold_percentage, trigger_count
        ) VALUES ('completed-session-1', 'mapping-1', 'Arm Raise', 'W', 90, 70, 3);
        "#,
    )
    .unwrap();
}

fn temp_json_path(name: &str) -> String {
    std::env::temp_dir()
        .join(format!(
            "human-controller-test-{name}-{}-{}.json",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ))
        .to_str()
        .unwrap()
        .to_string()
}

fn write_temp_json(name: &str, contents: &str) -> String {
    let path = temp_json_path(name);
    fs::write(&path, contents).unwrap();
    path
}

fn count(conn: &Connection, table: &str) -> i64 {
    conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| {
        row.get(0)
    })
    .unwrap()
}

fn export_json(patient: Value) -> String {
    json!({
        "exportFormatVersion": format::EXPORT_FORMAT_VERSION,
        "exportedAt": "0",
        "patient": patient,
    })
    .to_string()
}

/// The smallest patient that passes validation: every optional field left out so tests can
/// add back exactly the one field they are exercising.
fn base_patient() -> Value {
    json!({ "displayName": "Imported Patient", "presets": [] })
}

fn base_preset() -> Value {
    json!({
        "sourceId": "preset-1",
        "name": "Preset",
        "createdAt": "0",
        "defaultPoseFramesJson": r#"[{"t":0},{"t":1}]"#,
        "movementMappings": [],
    })
}

fn base_mapping() -> Value {
    json!({
        "sourceId": "mapping-1",
        "name": "Arm Raise",
        "createdAt": "0",
        "keybind": "W",
        "keypressType": "Click",
        "poseFramesJson": r#"[{"t":0}]"#,
        "selectedLandmarks": [11, 12],
        "thresholdPercentage": 90,
        "keypressTriggerThresholdPercentage": 70,
    })
}

fn base_completed_session() -> Value {
    json!({
        "presetId": "preset-1",
        "presetName": "Preset",
        "startedAtMs": 10_000,
        "durationMs": 6_000,
        "triggerCount": 3,
        "mappings": [{
            "mappingId": "mapping-1",
            "mappingName": "Arm Raise",
            "keybind": "W",
            "thresholdPercentage": 90,
            "keypressTriggerThresholdPercentage": 70,
            "triggerCount": 3,
        }],
    })
}

fn patient_with_preset(preset: Value) -> Value {
    let mut patient = base_patient();
    patient["presets"] = json!([preset]);
    patient
}

fn patient_with_mapping(mapping: Value) -> Value {
    let mut preset = base_preset();
    preset["movementMappings"] = json!([mapping]);
    patient_with_preset(preset)
}

fn patient_with_completed_session(session: Value) -> Value {
    let mut patient = base_patient();
    patient["completedSessions"] = json!([session]);
    patient
}

fn validation_error(patient: Value) -> String {
    format::parse_and_validate(&export_json(patient))
        .err()
        .expect("the export should have been rejected")
        .to_string()
}
