use rusqlite::{params, Connection};

use super::*;

#[test]
fn repository_orders_rows_and_decodes_landmarks() {
    let conn = setup_test_conn();
    mapping_repository::insert_movement_mapping(&conn, &raw_mapping("older", "1")).unwrap();
    mapping_repository::insert_movement_mapping(&conn, &raw_mapping("newer", "2")).unwrap();

    let rows = mapping_repository::select_movement_mappings_by_preset(&conn, "preset-1").unwrap();
    assert_eq!(
        rows.iter().map(|row| row.id.as_str()).collect::<Vec<_>>(),
        ["newer", "older"]
    );
    assert_eq!(rows[0].selected_landmarks, vec![11, 12]);
}

#[test]
fn malformed_stored_landmarks_fall_back_to_an_empty_selection() {
    let conn = setup_test_conn();
    conn.execute(
        "INSERT INTO movement_mappings (
            id, preset_id, name, keybind, keypress_type, pose_frames_json,
            selected_landmarks_json, created_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params!["mapping", "preset-1", "Squat", "S", "Click", "[]", "invalid", "1"],
    )
    .unwrap();

    let summary =
        &mapping_repository::select_movement_mappings_by_preset(&conn, "preset-1").unwrap()[0];
    let details =
        mapping_repository::select_movement_mapping_by_id(&conn, "mapping", "preset-1").unwrap();
    assert!(summary.selected_landmarks.is_empty());
    assert!(details.selected_landmarks.is_empty());
}

#[test]
fn insert_reports_duplicate_identifiers() {
    let conn = setup_test_conn();
    mapping_repository::insert_movement_mapping(&conn, &raw_mapping("duplicate", "1")).unwrap();
    assert!(
        mapping_repository::insert_movement_mapping(&conn, &raw_mapping("duplicate", "2")).is_err()
    );
}

#[test]
fn malformed_column_types_are_reported() {
    let conn = setup_test_conn();
    mapping_repository::insert_movement_mapping(&conn, &raw_mapping("mapping", "1")).unwrap();
    conn.execute(
        "UPDATE movement_mappings SET threshold_percentage = X'00' WHERE id = 'mapping'",
        [],
    )
    .unwrap();

    assert!(mapping_repository::select_movement_mappings_by_preset(&conn, "preset-1").is_err());
    assert!(
        mapping_repository::select_movement_mapping_by_id(&conn, "mapping", "preset-1").is_err()
    );
}

#[test]
fn every_repository_operation_reports_a_missing_schema() {
    let conn = Connection::open_in_memory().unwrap();
    let update = mapping_repository::MovementMappingUpdate {
        id: "mapping",
        preset_id: "preset",
        name: "Squat",
        keybind: "S",
        keypress_type: "Click",
        pose_frames_json: "[]",
        selected_landmarks_json: "[]",
        keypress_trigger_threshold_percentage: 60,
    };

    assert!(
        mapping_repository::insert_movement_mapping(&conn, &raw_mapping("mapping", "1")).is_err()
    );
    assert!(mapping_repository::preset_has_default_pose(&conn, "preset").is_err());
    assert!(mapping_repository::select_movement_mappings_by_preset(&conn, "preset").is_err());
    assert!(mapping_repository::select_movement_mapping_by_id(&conn, "mapping", "preset").is_err());
    assert!(mapping_repository::update_movement_mapping(&conn, &update).is_err());
    assert!(mapping_repository::delete_movement_mapping(&conn, "mapping", "preset").is_err());
    assert!(
        mapping_repository::update_movement_mapping_threshold(&conn, "mapping", "preset", 50)
            .is_err()
    );
}
