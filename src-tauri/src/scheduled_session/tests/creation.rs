use super::*;

#[test]
fn create_persists_a_session_with_joined_patient_details() {
    let conn = setup_test_conn();
    let scheduled_at_ms = i64::MAX;

    let created = service::create_scheduled_session(&conn, " patient-1 ", scheduled_at_ms).unwrap();

    assert!(created.id.starts_with("scheduled-session-"));
    assert_eq!(created.patient_id, TEST_PATIENT_ID);
    assert_eq!(created.patient_display_name, "Test Patient");
    assert_eq!(created.scheduled_at_ms, scheduled_at_ms);

    let stored = scheduled_repository::select_scheduled_session_by_id(&conn, &created.id).unwrap();
    assert_eq!(stored.id, created.id);
}

#[test]
fn deleting_a_patient_cascades_to_scheduled_sessions() {
    let conn = setup_test_conn();
    insert_scheduled_session(&conn, "session-1", TEST_PATIENT_ID, DAY_START_MS);

    conn.execute("DELETE FROM patients WHERE id = 'patient-1'", [])
        .unwrap();

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM scheduled_sessions", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert_eq!(count, 0);
}
