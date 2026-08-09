use std::panic::{catch_unwind, AssertUnwindSafe};

use rusqlite::Connection;
use tauri::Manager;

use super::*;
use crate::{native::contract::CompletedSessionDto, session::commands as session_commands};

fn dto(session_id: &str) -> CompletedSessionDto {
    CompletedSessionDto {
        session_id: session_id.into(),
        patient_id: TEST_PATIENT_ID.into(),
        preset_id: TEST_PRESET_ID.into(),
        started_at_ms: STARTED_AT_MS,
        ended_at_ms: STARTED_AT_MS + 1_000,
        trigger_counts_by_mapping: HashMap::from([("mapping-1".into(), 4)]),
    }
}

#[test]
fn commands_record_and_return_session_dtos() {
    let conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    let app = mock_app_with(conn);

    session_commands::record_completed_session(app.state(), dto("session-1")).unwrap();
    let sessions =
        session_commands::get_patient_sessions(app.state(), TEST_PATIENT_ID.into()).unwrap();

    assert_eq!(sessions.len(), 1);
    assert_eq!(sessions[0].id, "session-1");
    assert_eq!(sessions[0].preset_id, TEST_PRESET_ID);
    assert_eq!(sessions[0].preset_name, "Test Preset");
    assert_eq!(sessions[0].started_at_ms, STARTED_AT_MS);
    assert_eq!(sessions[0].duration_ms, 1_000);
    assert_eq!(sessions[0].trigger_count, 4);
    assert_eq!(sessions[0].mappings[0].mapping_id, "mapping-1");
    assert_eq!(
        sessions[0].mappings[0].keypress_trigger_threshold_percentage,
        65
    );
}

#[test]
fn commands_attach_stable_codes_to_operation_errors() {
    let app = mock_app_with(Connection::open_in_memory().unwrap());

    let record =
        session_commands::record_completed_session(app.state(), dto("session-1")).unwrap_err();
    assert_eq!(record.code, "session_record_failed");

    let history =
        session_commands::get_patient_sessions(app.state(), TEST_PATIENT_ID.into()).unwrap_err();
    assert_eq!(history.code, "patient_sessions_read_failed");
}

#[test]
fn both_commands_report_a_poisoned_database_lock() {
    let app = mock_app_with(setup_test_conn());
    let state = app.state::<crate::db::DbState>();
    let _ = catch_unwind(AssertUnwindSafe(|| {
        let _guard = state.conn.lock().unwrap();
        panic!("poison test database lock");
    }));

    let record = session_commands::record_completed_session(app.state(), dto("session-1"));
    let history = session_commands::get_patient_sessions(app.state(), TEST_PATIENT_ID.into());
    assert_eq!(record.unwrap_err().code, "database_lock_failed");
    assert_eq!(history.unwrap_err().code, "database_lock_failed");
}
