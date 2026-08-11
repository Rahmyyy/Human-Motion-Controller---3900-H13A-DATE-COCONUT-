use std::fs;

use rusqlite::params;

use super::{count, seed_source_patient, temp_json_path};
use crate::patient_transfer::service::{export_patient, import_patient};
use crate::test_support::setup_test_conn;

#[test]
fn export_then_import_round_trips_the_full_patient_tree() {
    let mut conn = setup_test_conn();
    seed_source_patient(&conn);

    let export_path = temp_json_path("round-trip");
    export_patient(&conn, "patient-1", &export_path).unwrap();

    let exported_json: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(&export_path).unwrap()).unwrap();
    assert_eq!(exported_json["exportFormatVersion"], 1);
    assert_eq!(
        exported_json["patient"]["completedSessions"]
            .as_array()
            .unwrap()
            .len(),
        1
    );

    let imported = import_patient(&mut conn, &export_path).unwrap();
    fs::remove_file(&export_path).ok();

    assert_ne!(imported.id, "patient-1");
    assert_eq!(imported.display_name, "Test Patient");
    assert_eq!(
        imported.clinical_notes.as_deref(),
        Some("Mobility programme")
    );
    assert_eq!(imported.created_at, "0");
    assert_eq!(imported.preset_count, 1);
    assert_eq!(imported.status, "needsReview");
    assert_eq!(imported.last_activity_at_ms, 4242);

    assert_eq!(count(&conn, "patients"), 2);

    let (preset_name, preset_created_at, default_pose): (String, String, String) = conn
        .query_row(
            "SELECT p.name, p.created_at, p.default_pose_frames_json
             FROM presets p
             WHERE p.patient_id = ?1",
            params![imported.id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap();
    assert_eq!(preset_name, "Test Preset");
    assert_eq!(preset_created_at, "0");
    assert_eq!(default_pose, r#"[{"t":0},{"t":33}]"#);

    let (
        mapping_name,
        mapping_created_at,
        keybind,
        keypress_type,
        pose_frames,
        landmarks,
        threshold,
        trigger_threshold,
    ): (String, String, String, String, String, String, u32, u32) = conn
        .query_row(
            "SELECT mm.name, mm.created_at, mm.keybind, mm.keypress_type,
                    mm.pose_frames_json, mm.selected_landmarks_json,
                    mm.threshold_percentage, mm.keypress_trigger_threshold_percentage
             FROM movement_mappings mm
             JOIN presets p ON p.id = mm.preset_id
             WHERE p.patient_id = ?1",
            params![imported.id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                ))
            },
        )
        .unwrap();

    assert_eq!(mapping_name, "Arm Raise");
    assert_eq!(mapping_created_at, "1");
    assert_eq!(keybind, "W");
    assert_eq!(keypress_type, "Click");
    assert_eq!(pose_frames, r#"[{"t":0},{"t":33}]"#);
    assert_eq!(landmarks, "[11,12]");
    assert_eq!(threshold, 90);
    assert_eq!(trigger_threshold, 70);

    // The original patient must be untouched by the import.
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
fn importing_the_same_export_twice_creates_two_independent_patients() {
    let mut conn = setup_test_conn();
    seed_source_patient(&conn);
    let export_path = temp_json_path("double-import");
    export_patient(&conn, "patient-1", &export_path).unwrap();

    let first = import_patient(&mut conn, &export_path).unwrap();
    let second = import_patient(&mut conn, &export_path).unwrap();
    fs::remove_file(&export_path).ok();

    assert_ne!(first.id, second.id);
    assert_eq!(count(&conn, "patients"), 3);
    assert_eq!(count(&conn, "presets"), 3);
    assert_eq!(count(&conn, "movement_mappings"), 3);
}
