use rusqlite::Connection;

use super::*;

fn update<'a>(id: &'a str) -> service::MovementMappingUpdate<'a> {
    service::MovementMappingUpdate {
        id,
        preset_id: "preset-1",
        name: "Deep Squat",
        keybind: "D",
        keypress_type: "Press",
        pose_frames_json: "[[4,5,6]]",
        selected_landmarks: &[13, 14],
        keypress_trigger_threshold_percentage: 75,
    }
}

#[test]
fn update_threshold_and_delete_round_trip() {
    let conn = setup_test_conn();
    let id = create_mapping(&conn);

    service::update_movement_mapping(&conn, &update(&id)).unwrap();
    service::update_movement_mapping_threshold(&conn, &id, "preset-1", 65).unwrap();

    let saved = service::get_movement_mapping(&conn, &id, "preset-1").unwrap();
    assert_eq!(saved.id, id);
    assert_eq!(saved.preset_id, "preset-1");
    assert_eq!(saved.name, "Deep Squat");
    assert_eq!(saved.keybind, "D");
    assert_eq!(saved.keypress_type, "Press");
    assert_eq!(saved.pose_frames_json, "[[4,5,6]]");
    assert_eq!(saved.selected_landmarks, vec![13, 14]);
    assert_eq!(saved.threshold_percentage, 65);
    assert_eq!(saved.keypress_trigger_threshold_percentage, 75);

    service::delete_movement_mapping(&conn, &id, "preset-1").unwrap();
    assert!(service::get_movement_mapping(&conn, &id, "preset-1").is_err());
}

#[test]
fn update_rejects_every_invalid_field() {
    let conn = setup_test_conn();
    let id = create_mapping(&conn);
    let cases = [
        (" ", "D", "Press", "[]", &[13][..], 60),
        ("Squat", " ", "Press", "[]", &[13][..], 60),
        ("Squat", "D", "Hold", "[]", &[13][..], 60),
        ("Squat", "D", "Press", " ", &[13][..], 60),
        ("Squat", "D", "Press", "[]", &[999][..], 60),
        ("Squat", "D", "Press", "[]", &[13][..], 29),
        ("Squat", "D", "Press", "[]", &[13][..], 101),
    ];

    for (name, keybind, keypress_type, frames, landmarks, threshold) in cases {
        let result = service::update_movement_mapping(
            &conn,
            &service::MovementMappingUpdate {
                id: &id,
                preset_id: "preset-1",
                name,
                keybind,
                keypress_type,
                pose_frames_json: frames,
                selected_landmarks: landmarks,
                keypress_trigger_threshold_percentage: threshold,
            },
        );
        assert!(result.is_err());
    }
}

#[test]
fn mutations_reject_missing_mappings_and_thresholds_outside_range() {
    let conn = setup_test_conn();

    assert!(service::update_movement_mapping(&conn, &update("missing")).is_err());
    assert!(service::delete_movement_mapping(&conn, "missing", "preset-1").is_err());
    assert!(service::update_movement_mapping_threshold(&conn, "missing", "preset-1", 50).is_err());

    let id = create_mapping(&conn);
    for threshold in [0, 101] {
        assert!(
            service::update_movement_mapping_threshold(&conn, &id, "preset-1", threshold,).is_err()
        );
    }

    for threshold in [1, 100] {
        service::update_movement_mapping_threshold(&conn, &id, "preset-1", threshold).unwrap();
    }
}

#[test]
fn reads_and_mutations_propagate_repository_errors() {
    let conn = Connection::open_in_memory().unwrap();

    assert!(service::get_movement_mappings(&conn, "preset-1").is_err());
    assert!(service::get_movement_mapping(&conn, "mapping", "preset-1").is_err());
    assert!(service::update_movement_mapping(&conn, &update("mapping")).is_err());
    assert!(service::delete_movement_mapping(&conn, "mapping", "preset-1").is_err());
    assert!(service::update_movement_mapping_threshold(&conn, "mapping", "preset-1", 50).is_err());
}
