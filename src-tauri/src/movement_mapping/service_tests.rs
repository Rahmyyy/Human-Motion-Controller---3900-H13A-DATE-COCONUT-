use super::*;
use crate::test_support::setup_test_conn;
use rusqlite::params;

#[test]
fn update_then_delete_round_trip() {
    let conn = setup_test_conn();
    create_movement_mapping(
        &conn,
        "preset-1",
        "Squat",
        "S",
        "Click",
        "[]",
        &[11, 12],
        60,
    )
    .unwrap();

    let mappings = get_movement_mappings(&conn, "preset-1").unwrap();
    assert_eq!(mappings.len(), 1);
    assert_eq!(mappings[0].selected_landmarks, vec![11, 12]);
    assert_eq!(mappings[0].keypress_type, "Click");
    assert_eq!(mappings[0].threshold_percentage, 100);
    assert_eq!(mappings[0].keypress_trigger_threshold_percentage, 60);
    let id = mappings[0].id.clone();

    update_movement_mapping(
        &conn,
        &MovementMappingUpdate {
            id: &id,
            preset_id: "preset-1",
            name: "Squat Deep",
            keybind: "D",
            keypress_type: "Press",
            pose_frames_json: "[[1,2,3]]",
            selected_landmarks: &[13, 14],
            keypress_trigger_threshold_percentage: 75,
        },
    )
    .unwrap();

    let updated = get_movement_mapping(&conn, &id, "preset-1").unwrap();
    assert_eq!(updated.name, "Squat Deep");
    assert_eq!(updated.keybind, "D");
    assert_eq!(updated.keypress_type, "Press");
    assert_eq!(updated.pose_frames_json, "[[1,2,3]]");
    assert_eq!(updated.selected_landmarks, vec![13, 14]);
    assert_eq!(updated.keypress_trigger_threshold_percentage, 75);

    delete_movement_mapping(&conn, &id, "preset-1").unwrap();

    let after_delete = get_movement_mapping(&conn, &id, "preset-1");
    assert!(after_delete.is_err());
}

#[test]
fn create_rejects_invalid_landmark() {
    let conn = setup_test_conn();
    let result =
        create_movement_mapping(&conn, "preset-1", "Squat", "S", "Click", "[]", &[999], 60);
    assert!(result.is_err());
}

#[test]
fn create_rejects_invalid_keypress_type() {
    let conn = setup_test_conn();
    let result = create_movement_mapping(&conn, "preset-1", "Squat", "S", "Hold", "[]", &[11], 60);
    assert_eq!(
        result.unwrap_err().to_string(),
        "Keypress type must be one of Toggle, Press, Release, or Click"
    );
}

#[test]
fn create_rejects_missing_preset() {
    let conn = setup_test_conn();
    let result = create_movement_mapping(
        &conn,
        "missing-preset",
        "Squat",
        "S",
        "Click",
        "[]",
        &[11],
        60,
    );

    assert!(result.is_err());
}

#[test]
fn create_requires_default_pose_calibration() {
    let conn = setup_test_conn();
    conn.execute(
        "
        INSERT INTO presets (
            id,
            patient_id,
            name,
            created_at
        ) VALUES (?1, ?2, ?3, ?4)
        ",
        params!["uncalibrated", "patient-1", "Uncalibrated", "1"],
    )
    .unwrap();

    let result = create_movement_mapping(
        &conn,
        "uncalibrated",
        "Squat",
        "S",
        "Click",
        "[]",
        &[11],
        60,
    );

    assert_eq!(
        result.unwrap_err().to_string(),
        "Record a default resting pose before creating movement mappings"
    );
}

#[test]
fn update_missing_mapping_errors() {
    let conn = setup_test_conn();
    let result = update_movement_mapping(
        &conn,
        &MovementMappingUpdate {
            id: "does-not-exist",
            preset_id: "preset-1",
            name: "Name",
            keybind: "K",
            keypress_type: "Click",
            pose_frames_json: "[]",
            selected_landmarks: &[11],
            keypress_trigger_threshold_percentage: 60,
        },
    );
    assert!(result.is_err());
}

#[test]
fn delete_missing_mapping_errors() {
    let conn = setup_test_conn();
    let result = delete_movement_mapping(&conn, "does-not-exist", "preset-1");
    assert!(result.is_err());
}

#[test]
fn update_rejects_empty_fields() {
    let conn = setup_test_conn();
    create_movement_mapping(&conn, "preset-1", "Squat", "S", "Click", "[]", &[11], 60).unwrap();
    let mappings = get_movement_mappings(&conn, "preset-1").unwrap();
    let id = mappings[0].id.clone();

    let result = update_movement_mapping(
        &conn,
        &MovementMappingUpdate {
            id: &id,
            preset_id: "preset-1",
            name: "  ",
            keybind: "K",
            keypress_type: "Click",
            pose_frames_json: "[]",
            selected_landmarks: &[11],
            keypress_trigger_threshold_percentage: 60,
        },
    );
    assert!(result.is_err());
}

#[test]
fn update_rejects_invalid_keypress_type() {
    let conn = setup_test_conn();
    create_movement_mapping(&conn, "preset-1", "Squat", "S", "Click", "[]", &[11], 60).unwrap();
    let mappings = get_movement_mappings(&conn, "preset-1").unwrap();
    let id = mappings[0].id.clone();

    let result = update_movement_mapping(
        &conn,
        &MovementMappingUpdate {
            id: &id,
            preset_id: "preset-1",
            name: "Squat",
            keybind: "S",
            keypress_type: "Hold",
            pose_frames_json: "[]",
            selected_landmarks: &[11],
            keypress_trigger_threshold_percentage: 60,
        },
    );

    assert_eq!(
        result.unwrap_err().to_string(),
        "Keypress type must be one of Toggle, Press, Release, or Click"
    );
}

#[test]
fn threshold_update_round_trip() {
    let conn = setup_test_conn();
    create_movement_mapping(&conn, "preset-1", "Squat", "S", "Click", "[]", &[11], 60).unwrap();
    let mapping = &get_movement_mappings(&conn, "preset-1").unwrap()[0];

    update_movement_mapping_threshold(&conn, &mapping.id, "preset-1", 65).unwrap();

    let updated = get_movement_mapping(&conn, &mapping.id, "preset-1").unwrap();
    assert_eq!(updated.threshold_percentage, 65);
}

#[test]
fn threshold_update_validates_range_and_mapping() {
    let conn = setup_test_conn();
    create_movement_mapping(&conn, "preset-1", "Squat", "S", "Click", "[]", &[11], 60).unwrap();
    let mapping = &get_movement_mappings(&conn, "preset-1").unwrap()[0];

    assert!(update_movement_mapping_threshold(&conn, &mapping.id, "preset-1", 0).is_err());
    assert!(update_movement_mapping_threshold(&conn, &mapping.id, "preset-1", 101).is_err());
    assert!(update_movement_mapping_threshold(&conn, "missing", "preset-1", 50).is_err());
}

#[test]
fn keypress_trigger_threshold_accepts_range_boundaries() {
    let conn = setup_test_conn();
    create_movement_mapping(&conn, "preset-1", "Squat", "S", "Click", "[]", &[11], 30).unwrap();
    let mapping = &get_movement_mappings(&conn, "preset-1").unwrap()[0];

    update_movement_mapping(
        &conn,
        &MovementMappingUpdate {
            id: &mapping.id,
            preset_id: "preset-1",
            name: "Squat",
            keybind: "S",
            keypress_type: "Click",
            pose_frames_json: "[]",
            selected_landmarks: &[11],
            keypress_trigger_threshold_percentage: 100,
        },
    )
    .unwrap();

    let updated = get_movement_mapping(&conn, &mapping.id, "preset-1").unwrap();
    assert_eq!(updated.keypress_trigger_threshold_percentage, 100);
}

#[test]
fn keypress_trigger_threshold_rejects_values_outside_range() {
    let conn = setup_test_conn();

    assert!(
        create_movement_mapping(&conn, "preset-1", "Squat", "S", "Click", "[]", &[11], 29).is_err()
    );
    assert!(
        create_movement_mapping(&conn, "preset-1", "Squat", "S", "Click", "[]", &[11], 101)
            .is_err()
    );

    create_movement_mapping(&conn, "preset-1", "Squat", "S", "Click", "[]", &[11], 60).unwrap();
    let mapping = &get_movement_mappings(&conn, "preset-1").unwrap()[0];
    for percentage in [29, 101] {
        let result = update_movement_mapping(
            &conn,
            &MovementMappingUpdate {
                id: &mapping.id,
                preset_id: "preset-1",
                name: "Squat",
                keybind: "S",
                keypress_type: "Click",
                pose_frames_json: "[]",
                selected_landmarks: &[11],
                keypress_trigger_threshold_percentage: percentage,
            },
        );
        assert!(result.is_err());
    }
}
