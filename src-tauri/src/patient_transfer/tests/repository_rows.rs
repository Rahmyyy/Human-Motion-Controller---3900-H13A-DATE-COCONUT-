use rusqlite::Connection;

use super::seed_source_patient;
use crate::patient_transfer::repository::{
    select_mappings_for_preset, select_patient_row, select_presets_for_patient,
    select_scheduled_sessions_for_patient,
};
use crate::test_support::setup_test_conn;

/// SQLite's TEXT affinity leaves a blob unconverted and its INTEGER affinity leaves a
/// non-numeric string unconverted, so writing either one corrupts a single column without
/// tripping a constraint. Every column each row mapper reads has to report that as an error
/// rather than panicking on the failed conversion.
const BLOB: &str = "X'00'";
const NOT_A_NUMBER: &str = "'not-a-number'";

fn corrupted(table: &str, column: &str, value: &str) -> Connection {
    let conn = setup_test_conn();
    seed_source_patient(&conn);
    conn.execute(&format!("UPDATE {table} SET {column} = {value}"), [])
        .unwrap();
    conn
}

#[test]
fn every_patient_column_reports_a_failed_conversion() {
    for (column, value) in [
        ("display_name", BLOB),
        ("clinical_notes", BLOB),
        ("created_at", BLOB),
        ("last_activity_at_ms", NOT_A_NUMBER),
    ] {
        let conn = corrupted("patients", column, value);

        assert!(
            select_patient_row(&conn, "patient-1").is_err(),
            "patients.{column} was tolerated"
        );
    }
}

#[test]
fn every_preset_column_reports_a_failed_conversion() {
    for (column, value) in [
        ("id", BLOB),
        ("name", BLOB),
        ("created_at", BLOB),
        ("default_pose_frames_json", BLOB),
    ] {
        let conn = setup_test_conn();
        seed_source_patient(&conn);
        // The seeded mapping's foreign key would block a rewrite of the preset's id.
        conn.execute("DELETE FROM movement_mappings", []).unwrap();
        conn.execute(&format!("UPDATE presets SET {column} = {value}"), [])
            .unwrap();

        assert!(
            select_presets_for_patient(&conn, "patient-1").is_err(),
            "presets.{column} was tolerated"
        );
    }
}

#[test]
fn every_mapping_column_reports_a_failed_conversion() {
    for (column, value) in [
        ("id", BLOB),
        ("name", BLOB),
        ("created_at", BLOB),
        ("keybind", BLOB),
        ("keypress_type", BLOB),
        ("pose_frames_json", BLOB),
        ("selected_landmarks_json", BLOB),
        ("threshold_percentage", NOT_A_NUMBER),
    ] {
        let conn = corrupted("movement_mappings", column, value);

        assert!(
            select_mappings_for_preset(&conn, "preset-1").is_err(),
            "movement_mappings.{column} was tolerated"
        );
    }
}

#[test]
fn every_scheduled_session_column_reports_a_failed_conversion() {
    for column in ["scheduled_at_ms", "created_at_ms"] {
        let conn = corrupted("scheduled_sessions", column, NOT_A_NUMBER);

        assert!(
            select_scheduled_sessions_for_patient(&conn, "patient-1").is_err(),
            "scheduled_sessions.{column} was tolerated"
        );
    }
}
