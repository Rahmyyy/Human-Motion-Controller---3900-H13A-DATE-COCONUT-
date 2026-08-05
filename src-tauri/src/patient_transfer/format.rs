use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};

/// Bumped whenever the exported JSON shape changes in a way older app versions can't read.
pub const SUPPORTED_EXPORT_FORMAT_VERSION: u32 = 1;

const MAX_PATIENT_DISPLAY_NAME_LENGTH: usize = 60;
const MAX_CLINICAL_NOTES_LENGTH: usize = 500;
const MAX_PRESET_NAME_LENGTH: usize = 60;
const TRACKED_LANDMARKS: [u32; 12] = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
const MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE: u32 = 30;
const MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE: u32 = 100;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportFile {
    pub export_format_version: u32,
    pub exported_at: String,
    pub patient: ExportedPatient,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedPatient {
    pub display_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clinical_notes: Option<String>,
    pub presets: Vec<ExportedPreset>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedPreset {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_pose_frames_json: Option<String>,
    pub movement_mappings: Vec<ExportedMapping>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedMapping {
    pub name: String,
    pub keybind: String,
    pub keypress_type: String,
    pub pose_frames_json: String,
    pub selected_landmarks: Vec<u32>,
    pub threshold_percentage: u32,
    pub keypress_trigger_threshold_percentage: u32,
}

/// Parses and fully validates an export file's contents before any of it reaches the database.
/// The format version is checked before attempting to deserialize the rest of the structure, so
/// a version mismatch produces a clear message instead of a confusing "missing field" error.
pub fn parse_and_validate(raw: &str) -> Result<ExportFile> {
    let value: serde_json::Value =
        serde_json::from_str(raw).map_err(|_| anyhow!("This file is not valid JSON"))?;

    match value.get("exportFormatVersion").and_then(|v| v.as_u64()) {
        Some(version) if version == SUPPORTED_EXPORT_FORMAT_VERSION as u64 => {}
        Some(version) => {
            return Err(anyhow!(
                "This file was exported with format version {version}, but this version of \
                 Human Controller only supports version {SUPPORTED_EXPORT_FORMAT_VERSION}"
            ));
        }
        None => {
            return Err(anyhow!(
                "This file is missing 'exportFormatVersion' and doesn't look like a Human \
                 Controller patient export"
            ));
        }
    }

    let export_file: ExportFile = serde_json::from_value(value)
        .map_err(|error| anyhow!("This file's structure is invalid: {error}"))?;

    validate_patient(&export_file.patient)?;

    Ok(export_file)
}

fn validate_patient(patient: &ExportedPatient) -> Result<()> {
    let display_name = patient.display_name.trim();

    if display_name.is_empty() {
        return Err(anyhow!("Patient display name cannot be empty"));
    }

    if display_name.chars().count() > MAX_PATIENT_DISPLAY_NAME_LENGTH {
        return Err(anyhow!(
            "Patient display name cannot exceed {MAX_PATIENT_DISPLAY_NAME_LENGTH} characters"
        ));
    }

    if let Some(notes) = &patient.clinical_notes {
        if notes.chars().count() > MAX_CLINICAL_NOTES_LENGTH {
            return Err(anyhow!(
                "Clinical notes cannot exceed {MAX_CLINICAL_NOTES_LENGTH} characters"
            ));
        }
    }

    for preset in &patient.presets {
        validate_preset(preset)?;
    }

    Ok(())
}

fn validate_preset(preset: &ExportedPreset) -> Result<()> {
    let name = preset.name.trim();

    if name.is_empty() {
        return Err(anyhow!("Preset name cannot be empty"));
    }

    if name.chars().count() > MAX_PRESET_NAME_LENGTH {
        return Err(anyhow!(
            "Preset name cannot exceed {MAX_PRESET_NAME_LENGTH} characters"
        ));
    }

    match &preset.default_pose_frames_json {
        Some(frames) => {
            let parsed: serde_json::Value = serde_json::from_str(frames)
                .map_err(|_| anyhow!("Preset '{name}' has invalid default pose frames JSON"))?;
            let frame_count = parsed.as_array().map(Vec::len).ok_or_else(|| {
                anyhow!("Preset '{name}' default pose frames must be a JSON array")
            })?;

            if frame_count < 2 {
                return Err(anyhow!(
                    "Preset '{name}' default pose must contain at least two frames"
                ));
            }
        }
        None => {
            if !preset.movement_mappings.is_empty() {
                return Err(anyhow!(
                    "Preset '{name}' has movement mappings but no default pose — a default \
                     pose is required before any movement mappings can exist"
                ));
            }
        }
    }

    for mapping in &preset.movement_mappings {
        validate_mapping(preset, mapping)?;
    }

    Ok(())
}

fn validate_mapping(preset: &ExportedPreset, mapping: &ExportedMapping) -> Result<()> {
    let preset_name = preset.name.trim();
    let name = mapping.name.trim();

    if name.is_empty() {
        return Err(anyhow!(
            "A movement mapping in preset '{preset_name}' has an empty name"
        ));
    }

    if mapping.keybind.trim().is_empty() {
        return Err(anyhow!("Movement mapping '{name}' keybind cannot be empty"));
    }

    match mapping.keypress_type.trim() {
        "Toggle" | "Press" | "Release" | "Click" => {}
        other => {
            return Err(anyhow!(
                "Movement mapping '{name}' has invalid keypress type '{other}'"
            ));
        }
    }

    if mapping.pose_frames_json.trim().is_empty() {
        return Err(anyhow!(
            "Movement mapping '{name}' pose frames cannot be empty"
        ));
    }

    if let Some(invalid) = mapping
        .selected_landmarks
        .iter()
        .find(|index| !TRACKED_LANDMARKS.contains(index))
    {
        return Err(anyhow!(
            "Movement mapping '{name}' has invalid landmark index: {invalid}"
        ));
    }

    if !(1..=100).contains(&mapping.threshold_percentage) {
        return Err(anyhow!(
            "Movement mapping '{name}' threshold must be between 1 and 100"
        ));
    }

    if !(MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE..=MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE)
        .contains(&mapping.keypress_trigger_threshold_percentage)
    {
        return Err(anyhow!(
            "Movement mapping '{name}' keypress trigger threshold must be between \
             {MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE} and \
             {MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE}"
        ));
    }

    Ok(())
}
