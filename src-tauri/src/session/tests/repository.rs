use rusqlite::Connection;

use super::*;

fn stored_session(id: &str) -> model::Session {
    model::Session {
        id: id.into(),
        patient_id: TEST_PATIENT_ID.into(),
        preset_id: TEST_PRESET_ID.into(),
        preset_name: "Test Preset".into(),
        started_at_ms: STARTED_AT_MS,
        ended_at_ms: STARTED_AT_MS + 1_000,
        duration_ms: 1_000,
        trigger_count: 0,
    }
}

fn stored_stat(id: &str) -> model::SessionMappingStat {
    model::SessionMappingStat {
        mapping_id: id.into(),
        mapping_name: "Accelerate".into(),
        keybind: "A".into(),
        threshold_percentage: 100,
        keypress_trigger_threshold_percentage: 60,
        trigger_count: 1,
    }
}

#[test]
fn insert_rolls_back_session_when_a_mapping_stat_fails() {
    let mut conn = setup_test_conn();
    let duplicate_stats = [stored_stat("mapping-1"), stored_stat("mapping-1")];

    assert!(session_repository::insert_session(
        &mut conn,
        &stored_session("session-1"),
        &duplicate_stats,
    )
    .is_err());
    assert!(!session_repository::session_exists(&conn, "session-1").unwrap());
}

#[test]
fn insert_reports_transaction_start_and_commit_failures() {
    let mut nested = setup_test_conn();
    nested.execute_batch("BEGIN").unwrap();
    assert!(
        session_repository::insert_session(&mut nested, &stored_session("session-1"), &[],)
            .is_err()
    );

    let mut deferred_foreign_key = setup_test_conn();
    deferred_foreign_key
        .execute_batch("PRAGMA defer_foreign_keys = ON")
        .unwrap();
    let mut invalid = stored_session("session-2");
    invalid.patient_id = "missing".into();
    assert!(session_repository::insert_session(&mut deferred_foreign_key, &invalid, &[]).is_err());
    assert!(!session_repository::session_exists(&deferred_foreign_key, "session-2").unwrap());
}

#[test]
fn repository_operations_report_a_missing_schema() {
    let mut conn = Connection::open_in_memory().unwrap();

    assert!(
        session_repository::insert_session(&mut conn, &stored_session("session"), &[]).is_err()
    );
    assert!(session_repository::session_exists(&conn, "session").is_err());
    assert!(session_repository::select_mapping_snapshots(&conn, "preset").is_err());
    assert!(session_repository::select_patient_sessions(&conn, "patient").is_err());
}

#[test]
fn malformed_mapping_and_history_column_types_are_reported() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    conn.execute_batch("UPDATE movement_mappings SET threshold_percentage = X'00';")
        .unwrap();
    assert!(session_repository::select_mapping_snapshots(&conn, TEST_PRESET_ID).is_err());

    conn.execute_batch("UPDATE movement_mappings SET threshold_percentage = 100;")
        .unwrap();
    record_session_at(&mut conn, "session-1", STARTED_AT_MS, &HashMap::new());
    conn.execute_batch("UPDATE sessions SET duration_ms = X'00';")
        .unwrap();
    assert!(session_repository::select_patient_sessions(&conn, TEST_PATIENT_ID).is_err());

    conn.execute_batch(
        "UPDATE sessions SET duration_ms = 1000;
                        UPDATE session_mapping_stats SET trigger_count = X'00';",
    )
    .unwrap();
    assert!(session_repository::select_patient_sessions(&conn, TEST_PATIENT_ID).is_err());
}
