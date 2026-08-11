use super::*;

#[test]
fn duplicate_session_ids_are_rejected_without_overwriting_history() {
    let mut conn = setup_test_conn();
    let counts = HashMap::new();
    record_session_at(&mut conn, "session-1", STARTED_AT_MS, &counts);

    let error = service::record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS + 2_000, &counts),
    )
    .unwrap_err();

    assert_eq!(error.to_string(), "Session has already been recorded");
    assert_eq!(read_session(&conn, "session-1").duration_ms, 1_000);
}

#[test]
fn a_session_cannot_end_before_it_starts() {
    let mut conn = setup_test_conn();
    let counts = HashMap::new();

    let error = service::record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS - 1, &counts),
    )
    .unwrap_err();
    assert_eq!(error.to_string(), "Session cannot end before it starts");
}

#[test]
fn preset_must_belong_to_the_patient() {
    let mut conn = setup_test_conn();
    conn.execute(
        "INSERT INTO patients (id, display_name, clinical_notes, created_at)
         VALUES ('patient-2', 'Other Patient', NULL, '0')",
        [],
    )
    .unwrap();
    let counts = HashMap::new();

    let error = service::record_completed_session(
        &mut conn,
        &service::CompletedSession {
            patient_id: "patient-2",
            ..completed_session("session-1", STARTED_AT_MS + 1_000, &counts)
        },
    )
    .unwrap_err();
    assert_eq!(error.to_string(), "Preset not found for this patient");
}

#[test]
fn recording_propagates_database_read_and_write_failures() {
    let counts = HashMap::new();
    let mut no_schema = rusqlite::Connection::open_in_memory().unwrap();
    assert!(service::record_completed_session(
        &mut no_schema,
        &completed_session("session-1", STARTED_AT_MS + 1_000, &counts),
    )
    .is_err());

    let mut conn = setup_test_conn();
    conn.execute_batch("DROP TABLE session_mapping_stats; DROP TABLE movement_mappings;")
        .unwrap();
    assert!(service::record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS + 1_000, &counts),
    )
    .is_err());
}
