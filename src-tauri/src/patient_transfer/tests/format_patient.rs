use serde_json::json;

use super::{
    base_mapping, base_patient, base_preset, export_json, patient_with_preset, validation_error,
};
use crate::patient_transfer::format::parse_and_validate;

#[test]
fn a_minimal_export_parses_and_fills_in_defaults() {
    let export = parse_and_validate(&export_json(base_patient())).unwrap();

    assert_eq!(export.export_format_version, 1);
    assert_eq!(export.patient.display_name, "Imported Patient");
    assert_eq!(export.patient.status, "active");
    assert_eq!(export.patient.last_activity_at_ms, 0);
    assert!(export.patient.scheduled_sessions.is_empty());
    assert!(export.patient.completed_sessions.is_empty());
}

#[test]
fn unparseable_input_is_reported_as_invalid_json() {
    let message = parse_and_validate("{ not json")
        .err()
        .expect("malformed input should be rejected")
        .to_string();

    assert_eq!(message, "This file is not valid JSON");
}

#[test]
fn the_format_version_is_checked_before_the_structure() {
    let missing = parse_and_validate(r#"{"patient": {}}"#)
        .err()
        .expect("a file without a version should be rejected")
        .to_string();
    assert!(
        missing.contains("missing 'exportFormatVersion'"),
        "{missing}"
    );

    let unsupported = parse_and_validate(r#"{"exportFormatVersion": 99, "patient": {}}"#)
        .err()
        .expect("a future version should be rejected")
        .to_string();
    assert!(unsupported.contains("format version 99"), "{unsupported}");
}

#[test]
fn a_valid_version_with_a_broken_structure_reports_the_structure() {
    let message = parse_and_validate(r#"{"exportFormatVersion": 1, "patient": {}}"#)
        .err()
        .expect("a patient without a display name should be rejected")
        .to_string();

    assert!(message.contains("structure is invalid"), "{message}");
}

#[test]
fn patient_fields_are_validated() {
    for (field, value, expected) in [
        ("displayName", json!("   "), "display name cannot be empty"),
        (
            "displayName",
            json!("a".repeat(61)),
            "display name cannot exceed 60 characters",
        ),
        (
            "clinicalNotes",
            json!("n".repeat(501)),
            "Clinical notes cannot exceed 500 characters",
        ),
        (
            "createdAt",
            json!("yesterday"),
            "Patient creation timestamp must be epoch seconds",
        ),
        ("status", json!("archived"), "invalid status 'archived'"),
        (
            "lastActivityAtMs",
            json!(-1),
            "last activity timestamp cannot be negative",
        ),
    ] {
        let mut patient = base_patient();
        patient[field] = value;

        let message = validation_error(patient);
        assert!(message.contains(expected), "{field}: {message}");
    }
}

#[test]
fn fields_at_their_documented_limits_are_accepted() {
    let mut patient = base_patient();
    patient["displayName"] = json!("a".repeat(60));
    patient["clinicalNotes"] = json!("n".repeat(500));
    patient["status"] = json!("needsReview");
    patient["createdAt"] = json!("1700000000");

    assert!(parse_and_validate(&export_json(patient)).is_ok());
}

#[test]
fn duplicate_preset_source_ids_are_rejected() {
    let mut patient = base_patient();
    patient["presets"] = json!([base_preset(), base_preset()]);

    assert!(
        validation_error(patient).contains("duplicate preset source IDs"),
        "two presets sharing a source ID should be rejected"
    );
}

#[test]
fn duplicate_mapping_source_ids_are_rejected_across_presets() {
    let mut first = base_preset();
    first["movementMappings"] = json!([base_mapping()]);
    let mut second = base_preset();
    second["sourceId"] = json!("preset-2");
    second["movementMappings"] = json!([base_mapping()]);

    let mut patient = base_patient();
    patient["presets"] = json!([first, second]);

    assert!(
        validation_error(patient).contains("duplicate movement mapping source IDs"),
        "two mappings sharing a source ID should be rejected"
    );
}

#[test]
fn presets_without_source_ids_do_not_collide() {
    let mut preset = base_preset();
    preset.as_object_mut().unwrap().remove("sourceId");
    let mut patient = base_patient();
    patient["presets"] = json!([preset.clone(), preset]);

    assert!(parse_and_validate(&export_json(patient)).is_ok());
}

#[test]
fn negative_scheduled_session_timestamps_are_rejected() {
    for field in ["scheduledAtMs", "createdAtMs"] {
        let mut session = json!({ "scheduledAtMs": 3000, "createdAtMs": 2000 });
        session[field] = json!(-1);

        let mut patient = base_patient();
        patient["scheduledSessions"] = json!([session]);

        let message = validation_error(patient);
        assert!(
            message.contains("Scheduled session timestamps cannot be negative"),
            "{field}: {message}"
        );
    }
}

#[test]
fn a_preset_error_is_surfaced_from_the_patient_level() {
    let mut preset = base_preset();
    preset["name"] = json!("");

    assert!(validation_error(patient_with_preset(preset)).contains("Preset name cannot be empty"));
}
