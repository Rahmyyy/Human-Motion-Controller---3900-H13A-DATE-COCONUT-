use std::collections::HashMap;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::{anyhow, Result};
use rusqlite::Connection;

use crate::patient::repository::Patient;
use crate::session;

use super::format::{
    self, ExportFile, ExportedCompletedSession, ExportedMapping, ExportedPatient, ExportedPreset,
    ExportedScheduledSession, ExportedSessionMapping,
};
use super::repository::{
    self, NewCompletedSession, NewMapping, NewPatientTree, NewPreset, NewScheduledSession,
    NewSessionMapping,
};

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
                    source_id: Some(mapping.id),
                    name: mapping.name,
                    created_at: Some(mapping.created_at),
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
            source_id: Some(preset_row.id),
            name: preset_row.name,
            created_at: Some(preset_row.created_at),
            default_pose_frames_json: preset_row.default_pose_frames_json,
            movement_mappings,
        });
    }

    let scheduled_sessions = repository::select_scheduled_sessions_for_patient(conn, patient_id)?
        .into_iter()
        .map(|session| ExportedScheduledSession {
            scheduled_at_ms: session.scheduled_at_ms,
            created_at_ms: session.created_at_ms,
        })
        .collect();

    let completed_sessions = session::repository::select_patient_sessions(conn, patient_id)?
        .into_iter()
        .map(|session| ExportedCompletedSession {
            preset_id: session.preset_id,
            preset_name: session.preset_name,
            started_at_ms: session.started_at_ms,
            duration_ms: session.duration_ms,
            trigger_count: session.trigger_count,
            mappings: session
                .mappings
                .into_iter()
                .map(|mapping| ExportedSessionMapping {
                    mapping_id: mapping.mapping_id,
                    mapping_name: mapping.mapping_name,
                    keybind: mapping.keybind,
                    threshold_percentage: mapping.threshold_percentage,
                    keypress_trigger_threshold_percentage: mapping
                        .keypress_trigger_threshold_percentage,
                    trigger_count: mapping.trigger_count,
                })
                .collect(),
        })
        .collect();

    let export_file = ExportFile {
        export_format_version: format::EXPORT_FORMAT_VERSION,
        exported_at: epoch_seconds_now()?,
        patient: ExportedPatient {
            display_name: patient.display_name,
            clinical_notes: patient.clinical_notes,
            created_at: Some(patient.created_at),
            status: patient.status,
            last_activity_at_ms: patient.last_activity_at_ms,
            presets,
            scheduled_sessions,
            completed_sessions,
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

pub fn import_patient(conn: &mut Connection, file_path: &str) -> Result<Patient> {
    let export_file = load_export_file(file_path)?;

    let now = SystemTime::now().duration_since(UNIX_EPOCH)?;
    let patient_id = format!("patient-{}", now.as_nanos());
    let imported_at = now.as_secs().to_string();

    let ExportedPatient {
        display_name,
        clinical_notes,
        created_at,
        status,
        last_activity_at_ms,
        presets: exported_presets,
        scheduled_sessions: exported_sessions,
        completed_sessions: exported_completed_sessions,
    } = export_file.patient;

    let patient_created_at = created_at.unwrap_or_else(|| imported_at.clone());

    let mut preset_id_map = HashMap::new();
    let mut mapping_id_map = HashMap::new();
    let mut presets = Vec::with_capacity(exported_presets.len());
    for (preset_index, preset) in exported_presets.into_iter().enumerate() {
        let preset_id = format!("{patient_id}-preset-{preset_index}");
        if let Some(source_id) = preset.source_id {
            preset_id_map.insert(source_id, preset_id.clone());
        }

        let mut mappings = Vec::with_capacity(preset.movement_mappings.len());
        for (mapping_index, mapping) in preset.movement_mappings.into_iter().enumerate() {
            let mapping_id = format!("{preset_id}-mapping-{mapping_index}");
            if let Some(source_id) = mapping.source_id {
                mapping_id_map.insert(source_id, mapping_id.clone());
            }

            mappings.push(NewMapping {
                id: mapping_id,
                name: mapping.name,
                created_at: mapping.created_at.unwrap_or_else(|| imported_at.clone()),
                keybind: mapping.keybind,
                keypress_type: mapping.keypress_type,
                pose_frames_json: mapping.pose_frames_json,
                selected_landmarks_json: serde_json::to_string(&mapping.selected_landmarks)?,
                threshold_percentage: mapping.threshold_percentage,
                keypress_trigger_threshold_percentage: mapping
                    .keypress_trigger_threshold_percentage,
            });
        }

        presets.push(NewPreset {
            id: preset_id,
            name: preset.name,
            created_at: preset.created_at.unwrap_or_else(|| imported_at.clone()),
            default_pose_frames_json: preset.default_pose_frames_json,
            mappings,
        });
    }

    let scheduled_sessions = exported_sessions
        .into_iter()
        .enumerate()
        .map(|(session_index, session)| NewScheduledSession {
            id: format!("{patient_id}-scheduled-session-{session_index}"),
            scheduled_at_ms: session.scheduled_at_ms,
            created_at_ms: session.created_at_ms,
        })
        .collect();

    let completed_sessions = exported_completed_sessions
        .into_iter()
        .enumerate()
        .map(|(session_index, session)| {
            let ended_at_ms = session
                .started_at_ms
                .checked_add(session.duration_ms)
                .ok_or_else(|| anyhow!("Completed session timestamp is too large"))?;

            Ok(NewCompletedSession {
                id: format!("{patient_id}-completed-session-{session_index}"),
                preset_id: preset_id_map
                    .get(&session.preset_id)
                    .cloned()
                    .unwrap_or(session.preset_id),
                preset_name: session.preset_name,
                started_at_ms: session.started_at_ms,
                ended_at_ms,
                duration_ms: session.duration_ms,
                trigger_count: session.trigger_count,
                mappings: session
                    .mappings
                    .into_iter()
                    .map(|mapping| NewSessionMapping {
                        mapping_id: mapping_id_map
                            .get(&mapping.mapping_id)
                            .cloned()
                            .unwrap_or(mapping.mapping_id),
                        mapping_name: mapping.mapping_name,
                        keybind: mapping.keybind,
                        threshold_percentage: mapping.threshold_percentage,
                        keypress_trigger_threshold_percentage: mapping
                            .keypress_trigger_threshold_percentage,
                        trigger_count: mapping.trigger_count,
                    })
                    .collect(),
            })
        })
        .collect::<Result<Vec<_>>>()?;

    repository::insert_patient_tree(
        conn,
        &NewPatientTree {
            patient_id: patient_id.clone(),
            display_name,
            clinical_notes,
            created_at: patient_created_at,
            status,
            last_activity_at_ms,
            presets,
            scheduled_sessions,
            completed_sessions,
        },
    )?;

    crate::patient::repository::select_patient_by_id(conn, &patient_id)
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
