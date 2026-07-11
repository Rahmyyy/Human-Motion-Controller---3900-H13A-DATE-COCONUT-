use super::*;

fn setup_conn() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute(
        "
        CREATE TABLE movement_mappings (
            id TEXT PRIMARY KEY,
            preset_id TEXT NOT NULL,
            name TEXT NOT NULL,
            keybind TEXT NOT NULL,
            pose_frames_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        ",
        [],
    )
    .unwrap();
    conn
}

#[test]
fn update_then_delete_round_trip() {
    let conn = setup_conn();
    create_movement_mapping(&conn, "preset-1", "Squat", "S", "[]").unwrap();

    let mappings = get_movement_mappings(&conn, "preset-1").unwrap();
    assert_eq!(mappings.len(), 1);
    let id = mappings[0].id.clone();

    update_movement_mapping(&conn, &id, "preset-1", "Squat Deep", "D", "[[1,2,3]]").unwrap();

    let updated = get_movement_mapping(&conn, &id, "preset-1").unwrap();
    assert_eq!(updated.name, "Squat Deep");
    assert_eq!(updated.keybind, "D");
    assert_eq!(updated.pose_frames_json, "[[1,2,3]]");

    delete_movement_mapping(&conn, &id, "preset-1").unwrap();

    let after_delete = get_movement_mapping(&conn, &id, "preset-1");
    assert!(after_delete.is_err());
}

#[test]
fn update_missing_mapping_errors() {
    let conn = setup_conn();
    let result = update_movement_mapping(&conn, "does-not-exist", "preset-1", "Name", "K", "[]");
    assert!(result.is_err());
}

#[test]
fn delete_missing_mapping_errors() {
    let conn = setup_conn();
    let result = delete_movement_mapping(&conn, "does-not-exist", "preset-1");
    assert!(result.is_err());
}

#[test]
fn update_rejects_empty_fields() {
    let conn = setup_conn();
    create_movement_mapping(&conn, "preset-1", "Squat", "S", "[]").unwrap();
    let mappings = get_movement_mappings(&conn, "preset-1").unwrap();
    let id = mappings[0].id.clone();

    let result = update_movement_mapping(&conn, &id, "preset-1", "  ", "K", "[]");
    assert!(result.is_err());
}
