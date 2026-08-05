use super::*;
use crate::test_support::setup_test_conn;
use rusqlite::params;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

/// `setup_test_conn` seeds `patient-1` / `preset-1` with an empty default pose, which isn't a
/// valid (>= 2 frame) pose on its own — top it up and attach one mapping so the source patient
/// has a realistic, importable tree.
fn seed_source_patient(conn: &rusqlite::Connection) {
    conn.execute(
        "UPDATE presets SET default_pose_frames_json = ?1 WHERE id = 'preset-1'",
        params![r#"[{"t":0},{"t":33}]"#],
    )
    .unwrap();

    conn.execute(
        "INSERT INTO movement_mappings (
            id, preset_id, name, keybind, keypress_type, pose_frames_json,
            selected_landmarks_json, threshold_percentage,
            keypress_trigger_threshold_percentage, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            "mapping-1",
            "preset-1",
            "Arm Raise",
            "W",
            "Click",
            r#"[{"t":0},{"t":33}]"#,
            "[11,12]",
            90,
            70,
            "1"
        ],
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

fn count(conn: &rusqlite::Connection, table: &str) -> i64 {
    conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| {
        row.get(0)
    })
    .unwrap()
}

#[test]
fn export_then_import_round_trips_the_full_patient_tree() {
    let mut conn = setup_test_conn();
    seed_source_patient(&conn);

    let export_path = temp_json_path("round-trip");
    export_patient(&conn, "patient-1", &export_path).unwrap();

    let imported = import_patient(&mut conn, &export_path).unwrap();
    fs::remove_file(&export_path).ok();

    assert_ne!(imported.id, "patient-1");
    assert_eq!(imported.display_name, "Test Patient");

    assert_eq!(count(&conn, "patients"), 2);
    assert_eq!(
        conn.query_row(
            "SELECT COUNT(*) FROM presets WHERE patient_id = ?1",
            params![imported.id],
            |row| row.get::<_, i64>(0),
        )
        .unwrap(),
        1
    );

    let (mapping_name, keybind, threshold, trigger_threshold): (String, String, u32, u32) = conn
        .query_row(
            "SELECT mm.name, mm.keybind, mm.threshold_percentage,
                    mm.keypress_trigger_threshold_percentage
             FROM movement_mappings mm
             JOIN presets p ON p.id = mm.preset_id
             WHERE p.patient_id = ?1",
            params![imported.id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .unwrap();

    assert_eq!(mapping_name, "Arm Raise");
    assert_eq!(keybind, "W");
    assert_eq!(threshold, 90);
    assert_eq!(trigger_threshold, 70);

    // The original patient must be untouched by the import.
    assert_eq!(count(&conn, "patients"), 2);
    assert_eq!(
        conn.query_row(
            "SELECT COUNT(*) FROM presets WHERE patient_id = 'patient-1'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .unwrap(),
        1
    );
}

#[test]
fn import_rejects_missing_export_format_version() {
    let mut conn = setup_test_conn();
    let path = write_temp_json(
        "missing-version",
        r#"{"exportedAt": "0", "patient": {"displayName": "X", "presets": []}}"#,
    );

    let result = import_patient(&mut conn, &path);
    fs::remove_file(&path).ok();

    let message = result.unwrap_err().to_string();
    assert!(message.contains("exportFormatVersion"), "{message}");
    assert_eq!(count(&conn, "patients"), 1);
}

#[test]
fn import_rejects_unsupported_export_format_version() {
    let mut conn = setup_test_conn();
    let path = write_temp_json(
        "future-version",
        r#"{"exportFormatVersion": 99, "exportedAt": "0",
            "patient": {"displayName": "X", "presets": []}}"#,
    );

    let result = import_patient(&mut conn, &path);
    fs::remove_file(&path).ok();

    let message = result.unwrap_err().to_string();
    assert!(message.contains("version"), "{message}");
    assert_eq!(count(&conn, "patients"), 1);
}

#[test]
fn import_rejects_malformed_json_without_writing_anything() {
    let mut conn = setup_test_conn();
    let path = write_temp_json("malformed", "{ this is not valid json");

    let result = import_patient(&mut conn, &path);
    fs::remove_file(&path).ok();

    assert!(result.is_err());
    assert_eq!(count(&conn, "patients"), 1);
    assert_eq!(count(&conn, "presets"), 1);
    assert_eq!(count(&conn, "movement_mappings"), 0);
}

#[test]
fn import_rejects_out_of_range_threshold_without_partial_writes() {
    let mut conn = setup_test_conn();
    let json = r#"{
        "exportFormatVersion": 1,
        "exportedAt": "0",
        "patient": {
            "displayName": "Bad Data Patient",
            "presets": [{
                "name": "Preset",
                "defaultPoseFramesJson": "[{\"t\":0},{\"t\":1}]",
                "movementMappings": [{
                    "name": "Bad Mapping",
                    "keybind": "A",
                    "keypressType": "Click",
                    "poseFramesJson": "[{\"t\":0}]",
                    "selectedLandmarks": [11],
                    "thresholdPercentage": 100,
                    "keypressTriggerThresholdPercentage": 15
                }]
            }]
        }
    }"#;
    let path = write_temp_json("bad-threshold", json);

    let result = import_patient(&mut conn, &path);
    fs::remove_file(&path).ok();

    let message = result.unwrap_err().to_string();
    assert!(message.contains("keypress trigger threshold"), "{message}");
    assert_eq!(count(&conn, "patients"), 1);
    assert_eq!(count(&conn, "presets"), 1);
    assert_eq!(count(&conn, "movement_mappings"), 0);
}
