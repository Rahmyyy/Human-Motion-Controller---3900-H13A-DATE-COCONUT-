use std::panic::{catch_unwind, AssertUnwindSafe};

use rusqlite::Connection;
use tauri::Manager;

use super::*;
use crate::scheduled_session::commands;

#[test]
fn commands_create_a_session_and_return_the_dashboard_dto() {
    let conn = setup_test_conn();
    insert_scheduled_session(&conn, "session-1", TEST_PATIENT_ID, 1_500);
    let app = mock_app_with(conn);

    let created =
        commands::create_scheduled_session(app.state(), TEST_PATIENT_ID.into(), i64::MAX).unwrap();
    let overview = commands::get_dashboard_overview(app.state(), DAY_START_MS, DAY_END_MS).unwrap();

    assert_eq!(created.patient_id, TEST_PATIENT_ID);
    assert_eq!(created.patient_display_name, "Test Patient");
    assert_eq!(created.scheduled_at_ms, i64::MAX);
    assert_eq!(overview.active_patient_count, 1);
    assert_eq!(overview.sessions_today_count, 1);
    assert_eq!(overview.todays_schedule.len(), 1);
    assert_eq!(overview.todays_schedule[0].id, "session-1");
    assert_eq!(overview.todays_schedule[0].patient_id, TEST_PATIENT_ID);
}

#[test]
fn commands_attach_stable_codes_to_operation_errors() {
    let app = mock_app_with(Connection::open_in_memory().unwrap());

    let create = commands::create_scheduled_session(app.state(), TEST_PATIENT_ID.into(), i64::MAX)
        .unwrap_err();
    let overview = commands::get_dashboard_overview(app.state(), 0, 1).unwrap_err();

    assert_eq!(create.code, "scheduled_session_create_failed");
    assert_eq!(overview.code, "dashboard_overview_get_failed");
}

#[test]
fn both_commands_report_a_poisoned_database_lock() {
    let app = mock_app_with(setup_test_conn());
    let state = app.state::<crate::db::DbState>();
    let _ = catch_unwind(AssertUnwindSafe(|| {
        let _guard = state.conn.lock().unwrap();
        panic!("poison test database lock");
    }));

    let create = commands::create_scheduled_session(app.state(), TEST_PATIENT_ID.into(), i64::MAX);
    let overview = commands::get_dashboard_overview(app.state(), 0, 1);

    assert_eq!(create.unwrap_err().code, "database_lock_failed");
    assert_eq!(overview.unwrap_err().code, "database_lock_failed");
}
