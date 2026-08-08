use rusqlite::Connection;

use super::*;

#[test]
fn repository_operations_report_a_missing_schema() {
    let conn = Connection::open_in_memory().unwrap();

    assert!(scheduled_repository::patient_exists(&conn, TEST_PATIENT_ID).is_err());
    assert!(scheduled_repository::insert_scheduled_session(
        &conn,
        "session-1",
        TEST_PATIENT_ID,
        DAY_START_MS,
        0,
    )
    .is_err());
    assert!(scheduled_repository::select_scheduled_session_by_id(&conn, "session-1").is_err());
    assert!(
        scheduled_repository::select_dashboard_overview(&conn, DAY_START_MS, DAY_END_MS).is_err()
    );
}

#[test]
fn repository_reports_missing_rows_and_foreign_key_failures() {
    let conn = setup_test_conn();

    assert!(!scheduled_repository::patient_exists(&conn, "missing").unwrap());
    assert!(scheduled_repository::select_scheduled_session_by_id(&conn, "missing").is_err());
    assert!(scheduled_repository::insert_scheduled_session(
        &conn,
        "session-1",
        "missing",
        DAY_START_MS,
        0,
    )
    .is_err());
}

#[test]
fn repository_reports_malformed_scheduled_session_columns() {
    let conn = setup_test_conn();
    insert_scheduled_session(&conn, "session-1", TEST_PATIENT_ID, DAY_START_MS);
    conn.execute_batch(
        "UPDATE patients
         SET display_name = X'00'
         WHERE id = 'patient-1';",
    )
    .unwrap();

    assert!(scheduled_repository::select_scheduled_session_by_id(&conn, "session-1").is_err());
    assert!(scheduled_repository::select_dashboard_overview(&conn, 0, DAY_END_MS).is_err());
}

#[test]
fn dashboard_repository_reports_failures_from_each_query_stage() {
    let no_patients = Connection::open_in_memory().unwrap();
    no_patients
        .execute_batch(
            "CREATE TABLE scheduled_sessions (
                id TEXT, patient_id TEXT, scheduled_at_ms INTEGER
             );",
        )
        .unwrap();
    assert!(scheduled_repository::select_dashboard_overview(&no_patients, 0, 1).is_err());

    let no_sessions = Connection::open_in_memory().unwrap();
    no_sessions
        .execute_batch("CREATE TABLE patients (id TEXT, display_name TEXT, status TEXT);")
        .unwrap();
    assert!(scheduled_repository::select_dashboard_overview(&no_sessions, 0, 1).is_err());
}
