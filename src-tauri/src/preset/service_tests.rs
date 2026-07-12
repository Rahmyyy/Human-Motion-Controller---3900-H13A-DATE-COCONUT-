use super::*;
use crate::test_support::setup_test_conn;
use rusqlite::params;

#[test]
fn create_preset_trims_name_and_returns_saved_preset() {
    let conn = setup_test_conn();

    let created = create_preset(&conn, "  Upper Limb Rehab  ").unwrap();
    let saved = get_preset(&conn, &created.id).unwrap();

    assert_eq!(created.name, "Upper Limb Rehab");
    assert_eq!(created.mapping_count, 0);
    assert_eq!(saved.id, created.id);
    assert_eq!(saved.name, created.name);
}

#[test]
fn create_preset_rejects_empty_name() {
    let conn = setup_test_conn();

    let result = create_preset(&conn, "   ");

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

    let result = create_preset(&conn, &name);

    assert!(result.is_err());
    assert_eq!(
        result.err().unwrap().to_string(),
        "Preset name cannot exceed 60 characters"
    );
}

#[test]
fn get_preset_rejects_empty_id() {
    let conn = setup_test_conn();

    let result = get_preset(&conn, "   ");

    assert!(result.is_err());
    assert_eq!(
        result.err().unwrap().to_string(),
        "Preset ID cannot be empty"
    );
}

#[test]
fn get_presets_returns_real_mapping_counts() {
    let conn = setup_test_conn();
    let created = create_preset(&conn, "Second Preset").unwrap();

    conn.execute(
        "
        INSERT INTO movement_mappings (
            id, preset_id, name, keybind, pose_frames_json, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ",
        params!["mapping-1", &created.id, "Squat", "S", "[]", "1"],
    )
    .unwrap();

    let presets = get_presets(&conn).unwrap();
    let empty_preset = presets
        .iter()
        .find(|preset| preset.id == "preset-1")
        .unwrap();
    let populated_preset = presets
        .iter()
        .find(|preset| preset.id == created.id)
        .unwrap();

    assert_eq!(empty_preset.mapping_count, 0);
    assert_eq!(populated_preset.mapping_count, 1);
}
