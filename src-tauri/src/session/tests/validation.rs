use super::*;

#[test]
fn recording_rejects_each_invalid_identifier_and_start_time() {
    let mut conn = setup_test_conn();
    let counts = HashMap::new();
    let cases = [
        (
            " ",
            TEST_PATIENT_ID,
            TEST_PRESET_ID,
            STARTED_AT_MS,
            "Session ID cannot be empty",
        ),
        (
            "session",
            " ",
            TEST_PRESET_ID,
            STARTED_AT_MS,
            "Patient ID cannot be empty",
        ),
        (
            "session",
            TEST_PATIENT_ID,
            " ",
            STARTED_AT_MS,
            "Preset ID cannot be empty",
        ),
        (
            "session",
            TEST_PATIENT_ID,
            TEST_PRESET_ID,
            0,
            "Session start time must be a positive timestamp",
        ),
    ];

    for (session_id, patient_id, preset_id, started_at_ms, expected) in cases {
        let error = service::record_completed_session(
            &mut conn,
            &service::CompletedSession {
                session_id,
                patient_id,
                preset_id,
                started_at_ms,
                ended_at_ms: STARTED_AT_MS + 1_000,
                trigger_counts_by_mapping: &counts,
            },
        )
        .unwrap_err();
        assert_eq!(error.to_string(), expected);
    }
}

#[test]
fn history_rejects_empty_and_unknown_patient_ids() {
    let conn = setup_test_conn();

    assert_eq!(
        service::list_patient_sessions(&conn, " ")
            .err()
            .unwrap()
            .to_string(),
        "Patient ID cannot be empty"
    );
    assert_eq!(
        service::list_patient_sessions(&conn, "missing")
            .err()
            .unwrap()
            .to_string(),
        "Patient not found"
    );
}

#[test]
fn history_propagates_repository_failures_after_patient_validation() {
    let conn = setup_test_conn();
    conn.execute_batch("DROP TABLE session_mapping_stats")
        .unwrap();

    assert!(service::list_patient_sessions(&conn, TEST_PATIENT_ID).is_err());
}
