use std::sync::Mutex;

use rusqlite::{params, Connection};
use tauri::{test::MockRuntime, App, Manager};

use crate::db::DbState;

pub(super) const TEST_PATIENT_ID: &str = "patient-1";
pub(super) const DAY_START_MS: i64 = 1_000;
pub(super) const DAY_END_MS: i64 = 2_000;

pub(super) fn insert_patient(conn: &Connection, id: &str, name: &str, status: &str) {
    conn.execute(
        "INSERT INTO patients (
            id, display_name, created_at, status, last_activity_at_ms
         ) VALUES (?1, ?2, '1', ?3, 0)",
        params![id, name, status],
    )
    .unwrap();
}

pub(super) fn insert_scheduled_session(
    conn: &Connection,
    id: &str,
    patient_id: &str,
    scheduled_at_ms: i64,
) {
    conn.execute(
        "INSERT INTO scheduled_sessions (
            id, patient_id, scheduled_at_ms, created_at_ms
         ) VALUES (?1, ?2, ?3, 0)",
        params![id, patient_id, scheduled_at_ms],
    )
    .unwrap();
}

pub(super) fn mock_app_with(conn: Connection) -> App<MockRuntime> {
    let app = tauri::test::mock_app();
    assert!(app.manage(DbState {
        conn: Mutex::new(conn),
    }));
    app
}
