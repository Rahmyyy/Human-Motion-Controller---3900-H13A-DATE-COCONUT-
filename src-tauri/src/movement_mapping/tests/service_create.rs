use rusqlite::{params, Connection};

use super::*;

#[test]
fn create_trims_fields_and_preserves_an_empty_landmark_selection() {
    let conn = setup_test_conn();
    service::create_movement_mapping(&conn, "preset-1", " Squat ", " K ", "Click", "[]", &[], 30)
        .unwrap();

    let mappings = service::get_movement_mappings(&conn, "preset-1").unwrap();
    assert_eq!(mappings.len(), 1);
    assert_eq!(mappings[0].name, "Squat");
    assert_eq!(mappings[0].keybind, "K");
    assert!(mappings[0].selected_landmarks.is_empty());
}

#[test]
fn validation_accepts_each_supported_keypress_type() {
    for keypress_type in ["Toggle", "Press", "Release", "Click"] {
        validation::validate_keypress_type(keypress_type).unwrap();
    }
}

#[test]
fn create_rejects_each_empty_required_field() {
    let conn = setup_test_conn();
    let cases = [
        (" ", "S", "Click", "[]", "name cannot be empty"),
        ("Squat", " ", "Click", "[]", "keybind cannot be empty"),
        ("Squat", "S", " ", "[]", "keypress type cannot be empty"),
        ("Squat", "S", "Click", " ", "pose frames cannot be empty"),
    ];

    for (name, keybind, keypress_type, frames, expected) in cases {
        let error = service::create_movement_mapping(
            &conn,
            "preset-1",
            name,
            keybind,
            keypress_type,
            frames,
            &[11],
            60,
        )
        .unwrap_err();
        assert!(error.to_string().contains(expected));
    }
}

#[test]
fn create_rejects_invalid_type_landmark_and_thresholds() {
    let conn = setup_test_conn();

    let invalid_type =
        service::create_movement_mapping(&conn, "preset-1", "Squat", "S", "Hold", "[]", &[11], 60);
    assert!(invalid_type
        .unwrap_err()
        .to_string()
        .contains("Toggle, Press, Release, or Click"));

    let invalid_landmark = service::create_movement_mapping(
        &conn,
        "preset-1",
        "Squat",
        "S",
        "Click",
        "[]",
        &[999],
        60,
    );
    assert_eq!(
        invalid_landmark.unwrap_err().to_string(),
        "Invalid landmark index: 999"
    );

    for threshold in [29, 101] {
        let result = service::create_movement_mapping(
            &conn,
            "preset-1",
            "Squat",
            "S",
            "Click",
            "[]",
            &[11],
            threshold,
        );
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("between 30 and 100"));
    }
}

#[test]
fn create_requires_an_existing_calibrated_preset() {
    let conn = setup_test_conn();
    conn.execute(
        "INSERT INTO presets (id, patient_id, name, created_at) VALUES (?1, ?2, ?3, ?4)",
        params!["uncalibrated", "patient-1", "Uncalibrated", "1"],
    )
    .unwrap();

    for preset_id in ["missing", "uncalibrated"] {
        let error = service::create_movement_mapping(
            &conn,
            preset_id,
            "Squat",
            "S",
            "Click",
            "[]",
            &[11],
            60,
        )
        .unwrap_err();
        assert!(error.to_string().contains("default resting pose"));
    }
}

#[test]
fn create_propagates_database_read_and_insert_errors() {
    let no_schema = Connection::open_in_memory().unwrap();
    assert!(service::create_movement_mapping(
        &no_schema,
        "preset-1",
        "Squat",
        "S",
        "Click",
        "[]",
        &[11],
        60,
    )
    .is_err());

    let missing_mapping_table = Connection::open_in_memory().unwrap();
    missing_mapping_table
        .execute_batch(
            "CREATE TABLE presets (id TEXT, default_pose_frames_json TEXT);
             INSERT INTO presets VALUES ('preset-1', '[]');",
        )
        .unwrap();
    assert!(service::create_movement_mapping(
        &missing_mapping_table,
        "preset-1",
        "Squat",
        "S",
        "Click",
        "[]",
        &[11],
        100,
    )
    .is_err());
}
