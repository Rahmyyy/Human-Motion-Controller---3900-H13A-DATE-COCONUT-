use serde_json::json;

use super::{
    base_mapping, base_preset, export_json, patient_with_mapping, patient_with_preset,
    validation_error,
};
use crate::patient_transfer::format::parse_and_validate;

fn preset_error(preset: serde_json::Value) -> String {
    validation_error(patient_with_preset(preset))
}

fn mapping_error(mapping: serde_json::Value) -> String {
    validation_error(patient_with_mapping(mapping))
}

#[test]
fn preset_fields_are_validated() {
    for (field, value, expected) in [
        ("sourceId", json!("  "), "Preset source ID cannot be empty"),
        ("name", json!("   "), "Preset name cannot be empty"),
        (
            "name",
            json!("p".repeat(61)),
            "Preset name cannot exceed 60 characters",
        ),
        (
            "createdAt",
            json!("yesterday"),
            "creation timestamp must be epoch seconds",
        ),
        (
            "defaultPoseFramesJson",
            json!("not json"),
            "invalid default pose frames JSON",
        ),
        (
            "defaultPoseFramesJson",
            json!(r#"{"t":0}"#),
            "default pose frames must be a JSON array",
        ),
        (
            "defaultPoseFramesJson",
            json!(r#"[{"t":0}]"#),
            "default pose must contain at least two frames",
        ),
    ] {
        let mut preset = base_preset();
        preset[field] = value;

        let message = preset_error(preset);
        assert!(message.contains(expected), "{field}: {message}");
    }
}

#[test]
fn a_preset_without_a_default_pose_may_not_carry_mappings() {
    let mut preset = base_preset();
    preset
        .as_object_mut()
        .unwrap()
        .remove("defaultPoseFramesJson");

    // No pose and no mappings is the state a freshly created preset is in.
    assert!(parse_and_validate(&export_json(patient_with_preset(preset.clone()))).is_ok());

    preset["movementMappings"] = json!([base_mapping()]);
    assert!(
        preset_error(preset).contains("has movement mappings but no default pose"),
        "mappings without a default pose should be rejected"
    );
}

#[test]
fn mapping_fields_are_validated() {
    for (field, value, expected) in [
        (
            "sourceId",
            json!("  "),
            "Movement mapping source ID cannot be empty",
        ),
        ("name", json!("   "), "has an empty name"),
        ("keybind", json!(" "), "keybind cannot be empty"),
        (
            "createdAt",
            json!("yesterday"),
            "creation timestamp must be epoch seconds",
        ),
        (
            "keypressType",
            json!("Squeeze"),
            "invalid keypress type 'Squeeze'",
        ),
        ("poseFramesJson", json!("  "), "pose frames cannot be empty"),
        (
            "selectedLandmarks",
            json!([11, 99]),
            "invalid landmark index: 99",
        ),
        (
            "thresholdPercentage",
            json!(0),
            "threshold must be between 1 and 100",
        ),
        (
            "thresholdPercentage",
            json!(101),
            "threshold must be between 1 and 100",
        ),
        (
            "keypressTriggerThresholdPercentage",
            json!(29),
            "keypress trigger threshold must be between 30 and 100",
        ),
        (
            "keypressTriggerThresholdPercentage",
            json!(101),
            "keypress trigger threshold must be between 30 and 100",
        ),
    ] {
        let mut mapping = base_mapping();
        mapping[field] = value;

        let message = mapping_error(mapping);
        assert!(message.contains(expected), "{field}: {message}");
    }
}

#[test]
fn mapping_values_at_their_boundaries_are_accepted() {
    for (threshold, trigger_threshold) in [(1, 30), (100, 100)] {
        let mut mapping = base_mapping();
        mapping["thresholdPercentage"] = json!(threshold);
        mapping["keypressTriggerThresholdPercentage"] = json!(trigger_threshold);

        assert!(
            parse_and_validate(&export_json(patient_with_mapping(mapping))).is_ok(),
            "{threshold}/{trigger_threshold} should be accepted"
        );
    }
}

#[test]
fn every_tracked_landmark_index_is_accepted() {
    let mut mapping = base_mapping();
    mapping["selectedLandmarks"] = json!([11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]);

    assert!(parse_and_validate(&export_json(patient_with_mapping(mapping))).is_ok());
}

#[test]
fn optional_mapping_identity_fields_may_be_absent() {
    let mut mapping = base_mapping();
    let fields = mapping.as_object_mut().unwrap();
    fields.remove("sourceId");
    fields.remove("createdAt");

    assert!(parse_and_validate(&export_json(patient_with_mapping(mapping))).is_ok());
}
