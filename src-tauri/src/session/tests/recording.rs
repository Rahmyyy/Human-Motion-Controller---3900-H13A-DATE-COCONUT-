use rusqlite::params;

use super::*;

#[test]
fn recording_stores_duration_and_preset_snapshot() {
    let mut conn = setup_test_conn();
    let counts = HashMap::new();
    service::record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS + 756_000, &counts),
    )
    .unwrap();

    let stored = read_session(&conn, "session-1");
    assert_eq!(stored.preset_id, TEST_PRESET_ID);
    assert_eq!(stored.preset_name, "Test Preset");
    assert_eq!(stored.started_at_ms, STARTED_AT_MS);
    assert_eq!(stored.ended_at_ms, STARTED_AT_MS + 756_000);
    assert_eq!(stored.duration_ms, 756_000);
    assert_eq!(stored.trigger_count, 0);
}

#[test]
fn recording_totals_all_reported_triggers() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    insert_mapping(&conn, "mapping-2", "Steer left", 55);
    let counts = HashMap::from([
        ("mapping-1".to_string(), 18),
        ("mapping-2".to_string(), 13),
        ("mapping-deleted".to_string(), 3),
    ]);

    service::record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS + 1_000, &counts),
    )
    .unwrap();

    assert_eq!(read_session(&conn, "session-1").trigger_count, 34);
    assert_eq!(read_stats(&conn, "session-1").len(), 2);
}

#[test]
fn recording_snapshots_triggered_and_untriggered_mappings() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    insert_mapping(&conn, "mapping-2", "Steer left", 55);
    let counts = HashMap::from([("mapping-1".to_string(), 9)]);

    service::record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS + 1_000, &counts),
    )
    .unwrap();

    let stats = read_stats(&conn, "session-1");
    assert_eq!(stats.len(), 2);
    assert_eq!(stats[0].mapping_name, "Accelerate");
    assert_eq!(stats[0].keybind, "A");
    assert_eq!(stats[0].threshold_percentage, 100);
    assert_eq!(stats[0].keypress_trigger_threshold_percentage, 65);
    assert_eq!(stats[0].trigger_count, 9);
    assert_eq!(stats[1].mapping_name, "Steer left");
    assert_eq!(stats[1].trigger_count, 0);
}

#[test]
fn snapshots_survive_later_mapping_and_preset_changes() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    let counts = HashMap::new();
    service::record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS + 1_000, &counts),
    )
    .unwrap();

    conn.execute(
        "UPDATE movement_mappings SET keypress_trigger_threshold_percentage = 80 WHERE id = ?1",
        params!["mapping-1"],
    )
    .unwrap();
    conn.execute("DELETE FROM presets WHERE id = ?1", params![TEST_PRESET_ID])
        .unwrap();

    assert_eq!(
        read_stats(&conn, "session-1")[0].keypress_trigger_threshold_percentage,
        65
    );
    assert_eq!(read_session(&conn, "session-1").preset_name, "Test Preset");
}

#[test]
fn deleting_patient_cascades_to_sessions_and_stats() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    let counts = HashMap::from([("mapping-1".to_string(), 2)]);
    record_session_at(&mut conn, "session-1", STARTED_AT_MS, &counts);

    conn.execute(
        "DELETE FROM patients WHERE id = ?1",
        params![TEST_PATIENT_ID],
    )
    .unwrap();

    assert!(!session_repository::session_exists(&conn, "session-1").unwrap());
    assert!(read_stats(&conn, "session-1").is_empty());
}
