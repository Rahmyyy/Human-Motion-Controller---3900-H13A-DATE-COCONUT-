use super::*;
use crate::test_support::setup_test_conn;
use rusqlite::params;

#[test]
fn duplicate_preset_copies_mappings_and_preserves_source() {
    let mut conn = setup_test_conn();
    conn.execute(
        "
        INSERT INTO movement_mappings (
            id, preset_id, name, keybind, keypress_type, pose_frames_json,
            selected_landmarks_json, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ",
        params![
            "mapping-1",
            "preset-1",
            "Squat",
            "S",
            "Click",
            "[[1,2,3]]",
            "[11,12]",
            "1"
        ],
    )
    .unwrap();

    conn.execute(
        "
        UPDATE movement_mappings
        SET threshold_percentage = 60, keypress_trigger_threshold_percentage = 75
        WHERE id = ?1
        ",
        params!["mapping-1"],
    )
    .unwrap();
    let duplicate = duplicate_preset(&mut conn, "preset-1").unwrap();

    let copied_mapping: (String, String, String, String, String, u32, u32) = conn
        .query_row(
            "
            SELECT name, keybind, keypress_type, pose_frames_json, selected_landmarks_json,
                  threshold_percentage, keypress_trigger_threshold_percentage
            FROM movement_mappings WHERE preset_id = ?1
            ",
            params![&duplicate.id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                ))
            },
        )
        .unwrap();

    assert_eq!(duplicate.name, "Test Preset (Copy)");
    assert_eq!(duplicate.mapping_count, 1);
    assert_eq!(
        copied_mapping,
        (
            "Squat".into(),
            "S".into(),
            "Click".into(),
            "[[1,2,3]]".into(),
            "[11,12]".into(),
            60,
            75
        )
    );
    assert_eq!(
        get_preset(&conn, "preset-1", "patient-1")
            .unwrap()
            .mapping_count,
        1
    );
}

#[test]
fn duplicate_preset_keeps_name_within_limit() {
    let mut conn = setup_test_conn();
    let source = create_preset(&conn, "patient-1", &"a".repeat(60)).unwrap();

    let duplicate = duplicate_preset(&mut conn, &source.id).unwrap();

    assert_eq!(duplicate.name.chars().count(), 60);
    assert!(duplicate.name.ends_with(" (Copy)"));
}

#[test]
fn duplicate_preset_copies_default_pose() {
    let mut conn = setup_test_conn();
    let frames = r#"[{"timestampMs":0},{"timestampMs":33}]"#;
    update_default_pose(&conn, "preset-1", "patient-1", frames).unwrap();

    let duplicate = duplicate_preset(&mut conn, "preset-1").unwrap();

    assert_eq!(duplicate.default_pose_frames_json.as_deref(), Some(frames));
}

#[test]
fn duplicate_preset_preserves_missing_default_pose() {
    let mut conn = setup_test_conn();
    let source = create_preset(&conn, "patient-1", "Uncalibrated Preset").unwrap();

    let duplicate = duplicate_preset(&mut conn, &source.id).unwrap();

    assert_eq!(duplicate.default_pose_frames_json, None);
}

#[test]
fn duplicate_preset_rejects_empty_id() {
    let mut conn = setup_test_conn();
    let result = duplicate_preset(&mut conn, "   ");

    assert!(result.is_err());
    assert_eq!(
        result.err().unwrap().to_string(),
        "Preset ID cannot be empty"
    );
}
