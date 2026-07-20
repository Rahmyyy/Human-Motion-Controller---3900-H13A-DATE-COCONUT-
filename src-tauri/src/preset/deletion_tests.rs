use super::*;
use crate::test_support::setup_test_conn;
use rusqlite::params;

#[test]
fn delete_preset_removes_preset_and_mappings() {
    let conn = setup_test_conn();
    conn.execute(
        "
        INSERT INTO movement_mappings (
            id, preset_id, name, keybind, pose_frames_json, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ",
        params!["mapping-1", "preset-1", "Squat", "S", "[]", "1"],
    )
    .unwrap();

    delete_preset(&conn, "preset-1").unwrap();

    let preset_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM presets WHERE id = ?1",
            ["preset-1"],
            |row| row.get(0),
        )
        .unwrap();
    let mapping_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM movement_mappings WHERE preset_id = ?1",
            ["preset-1"],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(preset_count, 0);
    assert_eq!(mapping_count, 0);
}

#[test]
fn delete_preset_rejects_missing_id() {
    let conn = setup_test_conn();
    let result = delete_preset(&conn, "missing-preset");

    assert_eq!(result.err().unwrap().to_string(), "Preset not found");
}

#[test]
fn delete_preset_rejects_empty_id() {
    let conn = setup_test_conn();
    let result = delete_preset(&conn, "   ");

    assert_eq!(
        result.err().unwrap().to_string(),
        "Preset ID cannot be empty"
    );
}
