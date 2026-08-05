use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::{anyhow, Result};
use rusqlite::Connection;

use super::format::{self, ExportFile, ExportedMapping, ExportedPatient, ExportedPreset};
use super::repository::{self, NewMapping, NewPatientTree, NewPreset};

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedPatientSummary {
    pub id: String,
    pub display_name: String,
}

pub fn export_patient(conn: &Connection, patient_id: &str, file_path: &str) -> Result<()> {
    let patient_id = patient_id.trim();

    if patient_id.is_empty() {
        return Err(anyhow!("Patient ID cannot be empty"));
    }

    let patient = repository::select_patient_row(conn, patient_id)?;
    let preset_rows = repository::select_presets_for_patient(conn, patient_id)?;

    let mut presets = Vec::with_capacity(preset_rows.len());
    for preset_row in preset_rows {
        let mapping_rows = repository::select_mappings_for_preset(conn, &preset_row.id)?;
        let movement_mappings = mapping_rows
            .into_iter()
            .map(|mapping| {
                Ok(ExportedMapping {
                    name: mapping.name,
                    keybind: mapping.keybind,
                    keypress_type: mapping.keypress_type,
                    pose_frames_json: mapping.pose_frames_json,
                    selected_landmarks: serde_json::from_str(&mapping.selected_landmarks_json)?,
                    threshold_percentage: mapping.threshold_percentage,
                    keypress_trigger_threshold_percentage: mapping
                        .keypress_trigger_threshold_percentage,
                })
            })
            .collect::<Result<Vec<_>>>()?;

        presets.push(ExportedPreset {
            name: preset_row.name,
            default_pose_frames_json: preset_row.default_pose_frames_json,
            movement_mappings,
        });
    }

    let export_file = ExportFile {
        export_format_version: format::SUPPORTED_EXPORT_FORMAT_VERSION,
        exported_at: epoch_seconds_now()?,
        patient: ExportedPatient {
            display_name: patient.display_name,
            clinical_notes: patient.clinical_notes,
            presets,
        },
    };

    let json = serde_json::to_string_pretty(&export_file)?;
    fs::write(file_path, json)?;

    Ok(())
}

/// Parses and validates an export file without writing anything, so the caller can inspect it
/// (e.g. to warn about a same-name patient already existing) before committing to the import.
pub fn preview_import(file_path: &str) -> Result<String> {
    let export_file = load_export_file(file_path)?;
    Ok(export_file.patient.display_name)
}

pub fn import_patient(conn: &mut Connection, file_path: &str) -> Result<ImportedPatientSummary> {
    let export_file = load_export_file(file_path)?;

    let now = SystemTime::now().duration_since(UNIX_EPOCH)?;
    let patient_id = format!("patient-{}", now.as_nanos());
    let created_at = now.as_secs().to_string();

    let presets = export_file
        .patient
        .presets
        .into_iter()
        .enumerate()
        .map(|(preset_index, preset)| {
            let preset_id = format!("{patient_id}-preset-{preset_index}");

            let mappings = preset
                .movement_mappings
                .into_iter()
                .enumerate()
                .map(|(mapping_index, mapping)| {
                    Ok(NewMapping {
                        id: format!("{preset_id}-mapping-{mapping_index}"),
                        name: mapping.name,
                        keybind: mapping.keybind,
                        keypress_type: mapping.keypress_type,
                        pose_frames_json: mapping.pose_frames_json,
                        selected_landmarks_json: serde_json::to_string(
                            &mapping.selected_landmarks,
                        )?,
                        threshold_percentage: mapping.threshold_percentage,
                        keypress_trigger_threshold_percentage: mapping
                            .keypress_trigger_threshold_percentage,
                    })
                })
                .collect::<Result<Vec<_>>>()?;

            Ok(NewPreset {
                id: preset_id,
                name: preset.name,
                default_pose_frames_json: preset.default_pose_frames_json,
                mappings,
            })
        })
        .collect::<Result<Vec<_>>>()?;

    let display_name = export_file.patient.display_name;

    repository::insert_patient_tree(
        conn,
        &NewPatientTree {
            patient_id: patient_id.clone(),
            display_name: display_name.clone(),
            clinical_notes: export_file.patient.clinical_notes,
            created_at,
            presets,
        },
    )?;

    Ok(ImportedPatientSummary {
        id: patient_id,
        display_name,
    })
}

fn load_export_file(file_path: &str) -> Result<ExportFile> {
    let raw =
        fs::read_to_string(file_path).map_err(|_| anyhow!("Could not read the selected file"))?;

    format::parse_and_validate(&raw)
}

fn epoch_seconds_now() -> Result<String> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)?
        .as_secs()
        .to_string())
}

#[cfg(test)]
#[path = "service_tests.rs"]
mod tests;
