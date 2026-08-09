use std::fs;

use serde_json::json;

use super::{base_mapping, base_patient, base_preset, count, export_json, write_temp_json};
use crate::patient_transfer::service::import_patient;
use crate::test_support::setup_test_conn;

/// Imports the given file contents into a freshly seeded database and returns the error message
/// alongside the connection, so callers can prove nothing was written.
fn failed_import(name: &str, contents: &str) -> (rusqlite::Connection, String) {
    let mut conn = setup_test_conn();
    let path = write_temp_json(name, contents);

    let result = import_patient(&mut conn, &path);
    fs::remove_file(&path).ok();

    let message = result
        .expect_err("the import should have been rejected")
        .to_string();

    (conn, message)
}

fn assert_nothing_was_imported(conn: &rusqlite::Connection) {
    assert_eq!(count(conn, "patients"), 1);
    assert_eq!(count(conn, "presets"), 1);
    assert_eq!(count(conn, "movement_mappings"), 0);
    assert_eq!(count(conn, "scheduled_sessions"), 0);
    assert_eq!(count(conn, "sessions"), 0);
}

#[test]
fn import_rejects_missing_export_format_version() {
    let (conn, message) = failed_import(
        "missing-version",
        r#"{"exportedAt": "0", "patient": {"displayName": "X", "presets": []}}"#,
    );

    assert!(message.contains("exportFormatVersion"), "{message}");
    assert_nothing_was_imported(&conn);
}

#[test]
fn import_rejects_unsupported_export_format_version() {
    let (conn, message) = failed_import(
        "future-version",
        r#"{"exportFormatVersion": 99, "exportedAt": "0",
            "patient": {"displayName": "X", "presets": []}}"#,
    );

    assert!(message.contains("version"), "{message}");
    assert_nothing_was_imported(&conn);
}

#[test]
fn import_rejects_malformed_json_without_writing_anything() {
    let (conn, message) = failed_import("malformed", "{ this is not valid json");

    assert_eq!(message, "This file is not valid JSON");
    assert_nothing_was_imported(&conn);
}

#[test]
fn import_rejects_out_of_range_threshold_without_partial_writes() {
    let mut mapping = base_mapping();
    mapping["keypressTriggerThresholdPercentage"] = json!(15);
    let mut preset = base_preset();
    preset["movementMappings"] = json!([mapping]);
    let mut patient = base_patient();
    patient["presets"] = json!([preset]);

    let (conn, message) = failed_import("bad-threshold", &export_json(patient));

    assert!(message.contains("keypress trigger threshold"), "{message}");
    assert_nothing_was_imported(&conn);
}

#[test]
fn import_rejects_an_invalid_patient_before_touching_the_database() {
    let mut patient = base_patient();
    patient["status"] = json!("archived");

    let (conn, message) = failed_import("bad-status", &export_json(patient));

    assert!(message.contains("invalid status 'archived'"), "{message}");
    assert_nothing_was_imported(&conn);
}

#[test]
fn import_rejects_a_preset_carrying_mappings_without_a_default_pose() {
    let mut preset = base_preset();
    preset
        .as_object_mut()
        .unwrap()
        .remove("defaultPoseFramesJson");
    preset["movementMappings"] = json!([base_mapping()]);
    let mut patient = base_patient();
    patient["presets"] = json!([preset]);

    let (conn, message) = failed_import("no-default-pose", &export_json(patient));

    assert!(message.contains("no default pose"), "{message}");
    assert_nothing_was_imported(&conn);
}

#[test]
fn import_rejects_an_invalid_completed_session() {
    let mut patient = base_patient();
    patient["completedSessions"] = json!([{
        "presetId": "preset-1",
        "presetName": "Preset",
        "startedAtMs": 0,
        "durationMs": 6_000,
        "triggerCount": 3,
        "mappings": [],
    }]);

    let (conn, message) = failed_import("bad-session", &export_json(patient));

    assert!(message.contains("start time must be positive"), "{message}");
    assert_nothing_was_imported(&conn);
}
