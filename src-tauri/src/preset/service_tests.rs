use super::*;
use crate::test_support::setup_test_conn;
use rusqlite::params;

const TEST_PATIENT_ID: &str = "patient-1";

#[test]
fn create_preset_trims_name_and_returns_saved_preset() {
    let conn = setup_test_conn();

    let created = create_preset(&conn, TEST_PATIENT_ID, "  Upper Limb Rehab  ").unwrap();
    let saved = get_preset(&conn, &created.id, TEST_PATIENT_ID).unwrap();

    assert_eq!(created.name, "Upper Limb Rehab");
    assert_eq!(created.mapping_count, 0);
    assert_eq!(created.default_pose_frames_json, None);
    assert_eq!(saved.id, created.id);
    assert_eq!(saved.name, created.name);
}

#[test]
fn update_default_pose_round_trip() {
    let conn = setup_test_conn();
    let created = create_preset(&conn, TEST_PATIENT_ID, "Calibrated Preset").unwrap();
    let frames = r#"[{"timestampMs":0},{"timestampMs":33}]"#;

    let updated = update_default_pose(&conn, &created.id, TEST_PATIENT_ID, frames).unwrap();

    assert_eq!(updated.default_pose_frames_json.as_deref(), Some(frames));
    assert_eq!(
        get_preset(&conn, &created.id, TEST_PATIENT_ID)
            .unwrap()
            .default_pose_frames_json
            .as_deref(),
        Some(frames)
    );
}

#[test]
fn update_default_pose_rejects_invalid_or_insufficient_frames() {
    let conn = setup_test_conn();

    assert!(update_default_pose(&conn, "preset-1", TEST_PATIENT_ID, "not-json").is_err());
    assert!(update_default_pose(&conn, "preset-1", TEST_PATIENT_ID, "[]").is_err());
    assert!(update_default_pose(&conn, "preset-1", TEST_PATIENT_ID, "[{}]").is_err());
}

#[test]
fn create_preset_rejects_empty_name() {
    let conn = setup_test_conn();

    let result = create_preset(&conn, TEST_PATIENT_ID, "   ");

    assert!(result.is_err());
    assert_eq!(
        result.err().unwrap().to_string(),
        "Preset name cannot be empty"
    );
}

#[test]
fn create_preset_rejects_name_over_sixty_characters() {
    let conn = setup_test_conn();
    let name = "a".repeat(61);

    let result = create_preset(&conn, TEST_PATIENT_ID, &name);

    assert!(result.is_err());
    assert_eq!(
        result.err().unwrap().to_string(),
        "Preset name cannot exceed 60 characters"
    );
}

#[test]
fn get_preset_rejects_empty_id() {
    let conn = setup_test_conn();

    let result = get_preset(&conn, "   ", TEST_PATIENT_ID);

    assert!(result.is_err());
    assert_eq!(
        result.err().unwrap().to_string(),
        "Preset ID cannot be empty"
    );
}

#[test]
fn get_presets_returns_real_mapping_counts() {
    let conn = setup_test_conn();
    let created = create_preset(&conn, TEST_PATIENT_ID, "Second Preset").unwrap();

    conn.execute(
        "
        INSERT INTO movement_mappings (
            id, preset_id, name, keybind, pose_frames_json, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ",
        params!["mapping-1", &created.id, "Squat", "S", "[]", "1"],
    )
    .unwrap();

    let presets = get_presets(&conn, TEST_PATIENT_ID).unwrap();
    let populated_preset = presets
        .iter()
        .find(|preset| preset.id == created.id)
        .unwrap();

    assert_eq!(populated_preset.mapping_count, 1);
}
