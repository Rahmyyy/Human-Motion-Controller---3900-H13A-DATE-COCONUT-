use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::params;

use super::service::{create_scheduled_session, get_dashboard_overview};
use crate::test_support::setup_test_conn;

fn future_timestamp_ms() -> i64 {
    i64::try_from(
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis(),
    )
    .unwrap()
        + 3_600_000
}

#[test]
fn create_session_persists_joined_patient_details() {
    let conn = setup_test_conn();
    let scheduled_at_ms = future_timestamp_ms();

    let created = create_scheduled_session(&conn, "patient-1", scheduled_at_ms).unwrap();

    assert_eq!(created.patient_id, "patient-1");
    assert_eq!(created.patient_display_name, "Test Patient");
    assert_eq!(created.scheduled_at_ms, scheduled_at_ms);
}

#[test]
fn create_session_rejects_missing_patient_and_past_time() {
    let conn = setup_test_conn();

    assert_eq!(
        create_scheduled_session(&conn, "missing", future_timestamp_ms())
            .unwrap_err()
            .to_string(),
        "Patient not found"
    );
    assert_eq!(
        create_scheduled_session(&conn, "patient-1", 1)
            .unwrap_err()
            .to_string(),
        "Scheduled session must be in the future"
    );
}

#[test]
fn overview_counts_patients_and_uses_inclusive_exclusive_day_bounds() {
    let conn = setup_test_conn();
    conn.execute(
        "INSERT INTO patients (id, display_name, created_at) VALUES ('patient-2', 'Second', '1')",
        [],
    )
    .unwrap();
    for (id, patient_id, scheduled_at_ms) in [
        ("before", "patient-1", 999_i64),
        ("start", "patient-1", 1_000_i64),
        ("later", "patient-2", 1_500_i64),
        ("end", "patient-1", 2_000_i64),
    ] {
        conn.execute(
            "INSERT INTO scheduled_sessions (id, patient_id, scheduled_at_ms, created_at_ms) VALUES (?1, ?2, ?3, 0)",
            params![id, patient_id, scheduled_at_ms],
        )
        .unwrap();
    }

    let overview = get_dashboard_overview(&conn, 1_000, 2_000).unwrap();

    assert_eq!(overview.active_patient_count, 2);
    assert_eq!(overview.sessions_today_count, 2);
    assert_eq!(
        overview
            .todays_schedule
            .iter()
            .map(|session| session.id.as_str())
            .collect::<Vec<_>>(),
        vec!["start", "later"]
    );
}

#[test]
fn deleting_a_patient_cascades_to_scheduled_sessions() {
    let conn = setup_test_conn();
    conn.execute(
        "INSERT INTO scheduled_sessions (id, patient_id, scheduled_at_ms, created_at_ms) VALUES ('session-1', 'patient-1', 1000, 0)",
        [],
    )
    .unwrap();

    conn.execute("DELETE FROM patients WHERE id = 'patient-1'", [])
        .unwrap();

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM scheduled_sessions", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert_eq!(count, 0);
}
