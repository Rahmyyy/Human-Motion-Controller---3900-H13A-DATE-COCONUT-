use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

pub const EXPORT_FORMAT_VERSION: u32 = 1;

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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(default = "default_patient_status")]
    pub status: String,
    #[serde(default)]
    pub last_activity_at_ms: i64,
    pub presets: Vec<ExportedPreset>,
    #[serde(default)]
    pub scheduled_sessions: Vec<ExportedScheduledSession>,
    #[serde(default)]
    pub completed_sessions: Vec<ExportedCompletedSession>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedPreset {
    /// Identity used only to reconnect imported history to the regenerated preset id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_id: Option<String>,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_pose_frames_json: Option<String>,
    pub movement_mappings: Vec<ExportedMapping>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedMapping {
    /// Identity used only to reconnect imported history to the regenerated mapping id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_id: Option<String>,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    pub keybind: String,
    pub keypress_type: String,
    pub pose_frames_json: String,
    pub selected_landmarks: Vec<u32>,
    pub threshold_percentage: u32,
    pub keypress_trigger_threshold_percentage: u32,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedScheduledSession {
    pub scheduled_at_ms: i64,
    pub created_at_ms: i64,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedCompletedSession {
    pub preset_id: String,
    pub preset_name: String,
    pub started_at_ms: i64,
    pub duration_ms: i64,
    pub trigger_count: i64,
    pub mappings: Vec<ExportedSessionMapping>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedSessionMapping {
    pub mapping_id: String,
    pub mapping_name: String,
    pub keybind: String,
    pub threshold_percentage: u32,
    pub keypress_trigger_threshold_percentage: u32,
    pub trigger_count: i64,
}

fn default_patient_status() -> String {
    "active".to_string()
}

/// Parses and fully validates an export file's contents before any of it reaches the database.
/// The format version is checked before attempting to deserialize the rest of the structure, so
/// a version mismatch produces a clear message instead of a confusing "missing field" error.
pub fn parse_and_validate(raw: &str) -> Result<ExportFile> {
    let value: serde_json::Value =
        serde_json::from_str(raw).map_err(|_| anyhow!("This file is not valid JSON"))?;

    match value.get("exportFormatVersion").and_then(|v| v.as_u64()) {
        Some(version) if version == EXPORT_FORMAT_VERSION as u64 => {}
        Some(version) => {
            return Err(anyhow!(
                "This file was exported with format version {version}, but this version of \
                 Human Controller only supports version {EXPORT_FORMAT_VERSION}"
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

    validate_created_at("Patient", patient.created_at.as_deref())?;

    match patient.status.as_str() {
        "active" | "needsReview" => {}
        status => return Err(anyhow!("Patient has invalid status '{status}'")),
    }

    if patient.last_activity_at_ms < 0 {
        return Err(anyhow!(
            "Patient last activity timestamp cannot be negative"
        ));
    }

    let mut preset_source_ids = HashSet::new();
    let mut mapping_source_ids = HashSet::new();
    for preset in &patient.presets {
        validate_preset(preset)?;
        if let Some(source_id) = preset.source_id.as_deref() {
            if !preset_source_ids.insert(source_id) {
                return Err(anyhow!(
                    "Patient export contains duplicate preset source IDs"
                ));
            }
        }
        for mapping in &preset.movement_mappings {
            if let Some(source_id) = mapping.source_id.as_deref() {
                if !mapping_source_ids.insert(source_id) {
                    return Err(anyhow!(
                        "Patient export contains duplicate movement mapping source IDs"
                    ));
                }
            }
        }
    }

    for session in &patient.scheduled_sessions {
        if session.scheduled_at_ms < 0 || session.created_at_ms < 0 {
            return Err(anyhow!("Scheduled session timestamps cannot be negative"));
        }
    }

    for session in &patient.completed_sessions {
        validate_completed_session(session)?;
    }

    Ok(())
}

fn validate_preset(preset: &ExportedPreset) -> Result<()> {
    let name = preset.name.trim();

    validate_optional_source_id("Preset", preset.source_id.as_deref())?;

    if name.is_empty() {
        return Err(anyhow!("Preset name cannot be empty"));
    }

    if name.chars().count() > MAX_PRESET_NAME_LENGTH {
        return Err(anyhow!(
            "Preset name cannot exceed {MAX_PRESET_NAME_LENGTH} characters"
        ));
    }

    validate_created_at(&format!("Preset '{name}'"), preset.created_at.as_deref())?;

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

    validate_optional_source_id("Movement mapping", mapping.source_id.as_deref())?;

    if name.is_empty() {
        return Err(anyhow!(
            "A movement mapping in preset '{preset_name}' has an empty name"
        ));
    }

    if mapping.keybind.trim().is_empty() {
        return Err(anyhow!("Movement mapping '{name}' keybind cannot be empty"));
    }

    validate_created_at(
        &format!("Movement mapping '{name}'"),
        mapping.created_at.as_deref(),
    )?;

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

fn validate_completed_session(session: &ExportedCompletedSession) -> Result<()> {
    if session.preset_id.trim().is_empty() {
        return Err(anyhow!("Completed session preset ID cannot be empty"));
    }
    if session.preset_name.trim().is_empty() {
        return Err(anyhow!("Completed session preset name cannot be empty"));
    }
    if session.started_at_ms <= 0 {
        return Err(anyhow!("Completed session start time must be positive"));
    }
    if session.duration_ms < 0 {
        return Err(anyhow!("Completed session duration cannot be negative"));
    }
    if session
        .started_at_ms
        .checked_add(session.duration_ms)
        .is_none()
    {
        return Err(anyhow!("Completed session timestamp is too large"));
    }
    if session.trigger_count < 0 {
        return Err(anyhow!(
            "Completed session trigger count cannot be negative"
        ));
    }

    let mut mapping_ids = HashSet::new();
    for mapping in &session.mappings {
        if mapping.mapping_id.trim().is_empty() {
            return Err(anyhow!("Completed session mapping ID cannot be empty"));
        }
        if !mapping_ids.insert(mapping.mapping_id.as_str()) {
            return Err(anyhow!(
                "Completed session contains duplicate mapping ID '{}'",
                mapping.mapping_id
            ));
        }
        if mapping.mapping_name.trim().is_empty() {
            return Err(anyhow!("Completed session mapping name cannot be empty"));
        }
        if mapping.keybind.trim().is_empty() {
            return Err(anyhow!("Completed session mapping keybind cannot be empty"));
        }
        if !(1..=100).contains(&mapping.threshold_percentage) {
            return Err(anyhow!(
                "Completed session movement threshold must be between 1 and 100"
            ));
        }
        if !(MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE..=MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE)
            .contains(&mapping.keypress_trigger_threshold_percentage)
        {
            return Err(anyhow!(
                "Completed session keypress trigger threshold must be between \
                 {MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE} and \
                 {MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE}"
            ));
        }
        if mapping.trigger_count < 0 {
            return Err(anyhow!(
                "Completed session mapping trigger count cannot be negative"
            ));
        }
    }

    Ok(())
}

fn validate_optional_source_id(owner: &str, source_id: Option<&str>) -> Result<()> {
    if source_id.is_some_and(|id| id.trim().is_empty()) {
        return Err(anyhow!("{owner} source ID cannot be empty"));
    }
    Ok(())
}

fn validate_created_at(owner: &str, created_at: Option<&str>) -> Result<()> {
    if let Some(created_at) = created_at {
        created_at
            .parse::<u64>()
            .map_err(|_| anyhow!("{owner} creation timestamp must be epoch seconds"))?;
    }

    Ok(())
}
