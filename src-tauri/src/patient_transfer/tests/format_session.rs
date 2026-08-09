use serde_json::json;

use super::{
    base_completed_session, export_json, patient_with_completed_session, validation_error,
};
use crate::patient_transfer::format::parse_and_validate;

fn session_error(session: serde_json::Value) -> String {
    validation_error(patient_with_completed_session(session))
}

fn mapping_error(mapping: serde_json::Value) -> String {
    let mut session = base_completed_session();
    session["mappings"] = json!([mapping]);
    session_error(session)
}

#[test]
fn a_completed_session_round_trips_through_validation() {
    let export = parse_and_validate(&export_json(patient_with_completed_session(
        base_completed_session(),
    )))
    .unwrap();

    let session = &export.patient.completed_sessions[0];
    assert_eq!(session.preset_id, "preset-1");
    assert_eq!(session.started_at_ms, 10_000);
    assert_eq!(session.duration_ms, 6_000);
    assert_eq!(session.mappings.len(), 1);
}

#[test]
fn completed_session_fields_are_validated() {
    for (field, value, expected) in [
        (
            "presetId",
            json!("  "),
            "Completed session preset ID cannot be empty",
        ),
        (
            "presetName",
            json!("  "),
            "Completed session preset name cannot be empty",
        ),
        (
            "startedAtMs",
            json!(0),
            "Completed session start time must be positive",
        ),
        (
            "startedAtMs",
            json!(-1),
            "Completed session start time must be positive",
        ),
        (
            "durationMs",
            json!(-1),
            "Completed session duration cannot be negative",
        ),
        (
            "triggerCount",
            json!(-1),
            "Completed session trigger count cannot be negative",
        ),
    ] {
        let mut session = base_completed_session();
        session[field] = value;

        let message = session_error(session);
        assert!(message.contains(expected), "{field}: {message}");
    }
}

#[test]
fn a_session_that_would_overflow_its_end_time_is_rejected() {
    let mut session = base_completed_session();
    session["startedAtMs"] = json!(i64::MAX);
    session["durationMs"] = json!(1);

    assert!(
        session_error(session).contains("Completed session timestamp is too large"),
        "an overflowing end time should be rejected before it reaches the database"
    );
}

#[test]
fn session_mapping_fields_are_validated() {
    for (field, value, expected) in [
        (
            "mappingId",
            json!("  "),
            "Completed session mapping ID cannot be empty",
        ),
        (
            "mappingName",
            json!("  "),
            "Completed session mapping name cannot be empty",
        ),
        (
            "keybind",
            json!("  "),
            "Completed session mapping keybind cannot be empty",
        ),
        (
            "thresholdPercentage",
            json!(0),
            "Completed session movement threshold must be between 1 and 100",
        ),
        (
            "thresholdPercentage",
            json!(101),
            "Completed session movement threshold must be between 1 and 100",
        ),
        (
            "keypressTriggerThresholdPercentage",
            json!(29),
            "Completed session keypress trigger threshold must be between 30 and 100",
        ),
        (
            "keypressTriggerThresholdPercentage",
            json!(101),
            "Completed session keypress trigger threshold must be between 30 and 100",
        ),
        (
            "triggerCount",
            json!(-1),
            "Completed session mapping trigger count cannot be negative",
        ),
    ] {
        let mut mapping = json!({
            "mappingId": "mapping-1",
            "mappingName": "Arm Raise",
            "keybind": "W",
            "thresholdPercentage": 90,
            "keypressTriggerThresholdPercentage": 70,
            "triggerCount": 3,
        });
        mapping[field] = value;

        let message = mapping_error(mapping);
        assert!(message.contains(expected), "{field}: {message}");
    }
}

#[test]
fn duplicate_mapping_ids_within_one_session_are_rejected() {
    let mut session = base_completed_session();
    let mapping = session["mappings"][0].clone();
    session["mappings"] = json!([mapping.clone(), mapping]);

    assert!(
        session_error(session).contains("duplicate mapping ID 'mapping-1'"),
        "a session cannot record the same mapping twice"
    );
}
