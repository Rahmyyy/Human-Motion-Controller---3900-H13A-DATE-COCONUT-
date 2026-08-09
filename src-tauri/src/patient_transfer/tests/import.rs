use std::fs;

use rusqlite::params;
use serde_json::json;

use super::{
    base_mapping, base_patient, base_preset, count, export_json, temp_json_path, write_temp_json,
};
use crate::patient_transfer::service::{import_patient, preview_import};
use crate::test_support::setup_test_conn;

#[test]
fn preview_reports_the_display_name_without_writing_anything() {
    let conn = setup_test_conn();
    let path = write_temp_json("preview", &export_json(base_patient()));

    let display_name = preview_import(&path).unwrap();
    fs::remove_file(&path).ok();

    assert_eq!(display_name, "Imported Patient");
    assert_eq!(count(&conn, "patients"), 1);
}

#[test]
fn a_missing_file_is_reported_for_both_preview_and_import() {
    let mut conn = setup_test_conn();
    let path = temp_json_path("never-written");

    assert_eq!(
        preview_import(&path).unwrap_err().to_string(),
        "Could not read the selected file"
    );
    assert_eq!(
        import_patient(&mut conn, &path).unwrap_err().to_string(),
        "Could not read the selected file"
    );
}

#[test]
fn preview_applies_the_same_validation_as_import() {
    let path = write_temp_json("preview-invalid", "{ not json");

    let message = preview_import(&path).unwrap_err().to_string();
    fs::remove_file(&path).ok();

    assert_eq!(message, "This file is not valid JSON");
}

#[test]
fn legacy_export_without_integration_fields_uses_safe_defaults() {
    let mut conn = setup_test_conn();
    let path = write_temp_json(
        "legacy-v1",
        r#"{
            "exportFormatVersion": 1,
            "exportedAt": "0",
            "patient": {
                "displayName": "Legacy Patient",
                "presets": []
            }
        }"#,
    );

    let imported = import_patient(&mut conn, &path).unwrap();
    fs::remove_file(&path).ok();

    assert_eq!(imported.status, "active");
    assert_eq!(imported.last_activity_at_ms, 0);
    assert_eq!(imported.preset_count, 0);
    assert_eq!(
        conn.query_row(
            "SELECT COUNT(*) FROM scheduled_sessions WHERE patient_id = ?1",
            params![imported.id],
            |row| row.get::<_, i64>(0),
        )
        .unwrap(),
        0
    );
}

/// Without a `createdAt` the import stamps its own time, and without a `sourceId` there is
/// nothing to rewire history to — both paths have to produce a usable patient.
#[test]
fn entries_without_identity_or_timestamps_are_imported() {
    let mut conn = setup_test_conn();

    let mut mapping = base_mapping();
    let mapping_fields = mapping.as_object_mut().unwrap();
    mapping_fields.remove("sourceId");
    mapping_fields.remove("createdAt");

    let mut preset = base_preset();
    let preset_fields = preset.as_object_mut().unwrap();
    preset_fields.remove("sourceId");
    preset_fields.remove("createdAt");
    preset["movementMappings"] = json!([mapping]);

    let mut patient = base_patient();
    patient["presets"] = json!([preset]);
    let path = write_temp_json("no-identity", &export_json(patient));

    let imported = import_patient(&mut conn, &path).unwrap();
    fs::remove_file(&path).ok();

    assert_eq!(imported.preset_count, 1);

    let (preset_created_at, mapping_created_at): (String, String) = conn
        .query_row(
            "SELECT presets.created_at, movement_mappings.created_at
             FROM presets
             JOIN movement_mappings ON movement_mappings.preset_id = presets.id
             WHERE presets.patient_id = ?1",
            params![imported.id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap();

    // Both fall back to the import time, which is always after the epoch.
    assert!(preset_created_at.parse::<u64>().unwrap() > 0);
    assert_eq!(preset_created_at, mapping_created_at);
    assert_eq!(imported.created_at, preset_created_at);
}

#[test]
fn a_database_failure_during_import_is_propagated() {
    let mut conn = rusqlite::Connection::open_in_memory().unwrap();
    let path = write_temp_json("no-schema", &export_json(base_patient()));

    let result = import_patient(&mut conn, &path);
    fs::remove_file(&path).ok();

    assert!(result.is_err());
}
