use std::fs;

use super::{seed_source_patient, temp_json_path};
use crate::patient_transfer::service::export_patient;
use crate::test_support::setup_test_conn;

#[test]
fn a_blank_patient_id_is_rejected_before_any_query() {
    let conn = setup_test_conn();

    let error = export_patient(&conn, "   ", &temp_json_path("blank-id")).unwrap_err();

    assert_eq!(error.to_string(), "Patient ID cannot be empty");
}

#[test]
fn exporting_an_unknown_patient_fails() {
    let conn = setup_test_conn();

    assert!(export_patient(&conn, "missing", &temp_json_path("missing")).is_err());
}

#[test]
fn the_exported_file_carries_the_whole_tree() {
    let conn = setup_test_conn();
    seed_source_patient(&conn);
    let path = temp_json_path("shape");

    export_patient(&conn, "patient-1", &path).unwrap();
    let exported: serde_json::Value = serde_json::from_str(&fs::read_to_string(&path).unwrap())
        .expect("the export must be valid JSON");
    fs::remove_file(&path).ok();

    let patient = &exported["patient"];
    assert_eq!(exported["exportFormatVersion"], 1);
    assert!(exported["exportedAt"]
        .as_str()
        .unwrap()
        .parse::<u64>()
        .is_ok());
    assert_eq!(patient["displayName"], "Test Patient");
    assert_eq!(patient["clinicalNotes"], "Mobility programme");
    assert_eq!(patient["status"], "needsReview");
    assert_eq!(patient["lastActivityAtMs"], 4242);
    assert_eq!(patient["presets"][0]["sourceId"], "preset-1");
    assert_eq!(
        patient["presets"][0]["movementMappings"][0]["selectedLandmarks"],
        serde_json::json!([11, 12])
    );
    assert_eq!(patient["scheduledSessions"].as_array().unwrap().len(), 1);
    assert_eq!(patient["completedSessions"].as_array().unwrap().len(), 1);
}

#[test]
fn a_patient_without_optional_data_exports_empty_collections() {
    let conn = setup_test_conn();
    let path = temp_json_path("bare");

    export_patient(&conn, "patient-1", &path).unwrap();
    let exported: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
    fs::remove_file(&path).ok();

    let patient = &exported["patient"];
    // `clinical_notes` is skipped entirely rather than serialised as null.
    assert!(patient.get("clinicalNotes").is_none());
    assert_eq!(
        patient["presets"][0]["movementMappings"]
            .as_array()
            .unwrap()
            .len(),
        0
    );
    assert_eq!(patient["scheduledSessions"].as_array().unwrap().len(), 0);
    assert_eq!(patient["completedSessions"].as_array().unwrap().len(), 0);
}

#[test]
fn a_file_path_that_cannot_be_written_is_reported() {
    let conn = setup_test_conn();
    let directory = std::env::temp_dir();

    // Writing over a directory always fails, whatever the platform calls the error.
    assert!(export_patient(&conn, "patient-1", directory.to_str().unwrap()).is_err());
}

/// Export reads five different tables; a value that cannot be converted back out of any of them
/// has to surface as an error rather than a panic mid-write.
#[test]
fn a_corrupted_source_row_fails_the_export() {
    for (table, column, value) in [
        ("patients", "display_name", "X'00'"),
        ("presets", "name", "X'00'"),
        ("movement_mappings", "name", "X'00'"),
        ("movement_mappings", "selected_landmarks_json", "'not json'"),
        ("scheduled_sessions", "scheduled_at_ms", "'not-a-number'"),
        ("sessions", "preset_name", "X'00'"),
    ] {
        let conn = setup_test_conn();
        seed_source_patient(&conn);
        conn.execute(&format!("UPDATE {table} SET {column} = {value}"), [])
            .unwrap();

        assert!(
            export_patient(&conn, "patient-1", &temp_json_path("corrupt")).is_err(),
            "export tolerated a corrupted {table}.{column}"
        );
    }
}
