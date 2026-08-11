use rusqlite::Connection;

use super::*;

#[test]
fn duplicate_copies_mapping_pose_and_name_while_preserving_the_source() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", TEST_PRESET_ID);
    service::update_default_pose(&conn, TEST_PRESET_ID, TEST_PATIENT_ID, VALID_FRAMES).unwrap();

    let duplicate = service::duplicate_preset(&mut conn, TEST_PRESET_ID).unwrap();

    assert_eq!(duplicate.name, "Test Preset (Copy)");
    assert_eq!(duplicate.mapping_count, 1);
    assert_eq!(
        duplicate.default_pose_frames_json.as_deref(),
        Some(VALID_FRAMES)
    );
    assert_eq!(
        service::get_preset(&conn, TEST_PRESET_ID, TEST_PATIENT_ID)
            .unwrap()
            .mapping_count,
        1
    );
    let copied: (String, String, u32, u32) = conn
        .query_row(
            "SELECT name, selected_landmarks_json, threshold_percentage,
                    keypress_trigger_threshold_percentage
             FROM movement_mappings WHERE preset_id = ?1",
            [&duplicate.id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .unwrap();
    assert_eq!(copied, ("Squat".into(), "[11,12]".into(), 60, 75));
    assert!(patient_activity(&conn) > 0);
}

#[test]
fn duplicate_truncates_long_unicode_names_to_the_limit() {
    let mut conn = setup_test_conn();
    let source = service::create_preset(&conn, TEST_PATIENT_ID, &"🙂".repeat(60)).unwrap();

    let duplicate = service::duplicate_preset(&mut conn, &source.id).unwrap();

    assert_eq!(duplicate.name.chars().count(), 60);
    assert!(duplicate.name.ends_with(" (Copy)"));
}

#[test]
fn duplicate_preserves_a_missing_default_pose() {
    let mut conn = setup_test_conn();
    let source = service::create_preset(&conn, TEST_PATIENT_ID, "Uncalibrated").unwrap();

    let duplicate = service::duplicate_preset(&mut conn, &source.id).unwrap();

    assert_eq!(duplicate.default_pose_frames_json, None);
}

#[test]
fn duplicate_rejects_a_missing_source_and_propagates_copy_failures() {
    let mut conn = setup_test_conn();
    assert!(service::duplicate_preset(&mut conn, "missing").is_err());

    conn.execute_batch(
        "DROP TABLE movement_mappings;
         CREATE TABLE movement_mappings (id TEXT, preset_id TEXT);",
    )
    .unwrap();
    assert!(service::duplicate_preset(&mut conn, TEST_PRESET_ID).is_err());
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM presets", [], |row| row.get(0))
        .unwrap();
    assert_eq!(count, 1);
}

#[test]
fn duplicate_propagates_patient_activity_failures() {
    let mut conn = Connection::open_in_memory().unwrap();
    conn.execute_batch(
        "CREATE TABLE patients (id TEXT PRIMARY KEY);
         INSERT INTO patients VALUES ('patient-1');
         CREATE TABLE presets (
            id TEXT PRIMARY KEY, patient_id TEXT, name TEXT, created_at TEXT,
            default_pose_frames_json TEXT
         );
         INSERT INTO presets VALUES ('preset-1', 'patient-1', 'Test', '0', NULL);
         CREATE TABLE movement_mappings (
            id TEXT, preset_id TEXT, name TEXT, keybind TEXT, keypress_type TEXT,
            pose_frames_json TEXT, selected_landmarks_json TEXT,
            threshold_percentage INTEGER,
            keypress_trigger_threshold_percentage INTEGER, created_at TEXT
         );",
    )
    .unwrap();

    assert!(service::duplicate_preset(&mut conn, TEST_PRESET_ID).is_err());
}
