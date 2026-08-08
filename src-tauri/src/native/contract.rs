use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::{movement_mapping::model, patient, preset, scheduled_session, session};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PatientDto {
    pub id: String,
    pub display_name: String,
    pub clinical_notes: Option<String>,
    pub created_at: String,
    pub preset_count: i64,
    pub status: String,
    pub last_activity_at_ms: i64,
}

impl From<patient::repository::Patient> for PatientDto {
    fn from(patient: patient::repository::Patient) -> Self {
        Self {
            id: patient.id,
            display_name: patient.display_name,
            clinical_notes: patient.clinical_notes,
            created_at: patient.created_at,
            preset_count: patient.preset_count,
            status: patient.status,
            last_activity_at_ms: patient.last_activity_at_ms,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledSessionDto {
    pub id: String,
    pub patient_id: String,
    pub patient_display_name: String,
    pub scheduled_at_ms: i64,
}

impl From<scheduled_session::repository::ScheduledSession> for ScheduledSessionDto {
    fn from(session: scheduled_session::repository::ScheduledSession) -> Self {
        Self {
            id: session.id,
            patient_id: session.patient_id,
            patient_display_name: session.patient_display_name,
            scheduled_at_ms: session.scheduled_at_ms,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardOverviewDto {
    pub active_patient_count: i64,
    pub sessions_today_count: i64,
    pub todays_schedule: Vec<ScheduledSessionDto>,
}

impl From<scheduled_session::repository::DashboardOverview> for DashboardOverviewDto {
    fn from(overview: scheduled_session::repository::DashboardOverview) -> Self {
        Self {
            active_patient_count: overview.active_patient_count,
            sessions_today_count: overview.sessions_today_count,
            todays_schedule: overview
                .todays_schedule
                .into_iter()
                .map(ScheduledSessionDto::from)
                .collect(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PresetDto {
    pub id: String,
    pub patient_id: String,
    pub name: String,
    pub created_at: String,
    pub mapping_count: i64,
    pub default_pose_frames_json: Option<String>,
}

impl From<preset::repository::Preset> for PresetDto {
    fn from(preset: preset::repository::Preset) -> Self {
        Self {
            id: preset.id,
            patient_id: preset.patient_id,
            name: preset.name,
            created_at: preset.created_at,
            mapping_count: preset.mapping_count,
            default_pose_frames_json: preset.default_pose_frames_json,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MovementMappingSummaryDto {
    pub id: String,
    pub name: String,
    pub keybind: String,
    pub keypress_type: String,
    pub pose_frames_json: String,
    pub selected_landmarks: Vec<u32>,
    pub threshold_percentage: u32,
    pub keypress_trigger_threshold_percentage: u32,
}

impl From<model::MovementMappingSummary> for MovementMappingSummaryDto {
    fn from(mapping: model::MovementMappingSummary) -> Self {
        Self {
            id: mapping.id,
            name: mapping.name,
            keybind: mapping.keybind,
            keypress_type: mapping.keypress_type,
            pose_frames_json: mapping.pose_frames_json,
            selected_landmarks: mapping.selected_landmarks,
            threshold_percentage: mapping.threshold_percentage,
            keypress_trigger_threshold_percentage: mapping.keypress_trigger_threshold_percentage,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MovementMappingDetailsDto {
    pub id: String,
    pub preset_id: String,
    pub name: String,
    pub keybind: String,
    pub keypress_type: String,
    pub pose_frames_json: String,
    pub selected_landmarks: Vec<u32>,
    pub threshold_percentage: u32,
    pub keypress_trigger_threshold_percentage: u32,
}

impl From<model::MovementMappingDetails> for MovementMappingDetailsDto {
    fn from(mapping: model::MovementMappingDetails) -> Self {
        Self {
            id: mapping.id,
            preset_id: mapping.preset_id,
            name: mapping.name,
            keybind: mapping.keybind,
            keypress_type: mapping.keypress_type,
            pose_frames_json: mapping.pose_frames_json,
            selected_landmarks: mapping.selected_landmarks,
            threshold_percentage: mapping.threshold_percentage,
            keypress_trigger_threshold_percentage: mapping.keypress_trigger_threshold_percentage,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SessionSummaryDto {
    pub elapsed_ms: u64,
    pub trigger_count: u32,
    pub trigger_counts_by_mapping: HashMap<String, u32>,
}

/// One mapping's frozen settings and activity within a completed session.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SessionMappingStatDto {
    pub mapping_id: String,
    pub mapping_name: String,
    pub keybind: String,
    pub threshold_percentage: u32,
    pub keypress_trigger_threshold_percentage: u32,
    pub trigger_count: i64,
}

impl From<session::model::SessionMappingStat> for SessionMappingStatDto {
    fn from(stat: session::model::SessionMappingStat) -> Self {
        Self {
            mapping_id: stat.mapping_id,
            mapping_name: stat.mapping_name,
            keybind: stat.keybind,
            threshold_percentage: stat.threshold_percentage,
            keypress_trigger_threshold_percentage: stat.keypress_trigger_threshold_percentage,
            trigger_count: stat.trigger_count,
        }
    }
}

/// A completed session on its way to the patient history page. `ended_at_ms` is left out because
/// it is `started_at_ms + duration_ms`; the millisecond values stay well inside the range a
/// JavaScript number holds exactly, so they cross as plain numbers.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PatientSessionDto {
    pub id: String,
    pub preset_id: String,
    pub preset_name: String,
    pub started_at_ms: i64,
    pub duration_ms: i64,
    pub trigger_count: i64,
    pub mappings: Vec<SessionMappingStatDto>,
}

impl From<session::model::PatientSession> for PatientSessionDto {
    fn from(session: session::model::PatientSession) -> Self {
        Self {
            id: session.id,
            preset_id: session.preset_id,
            preset_name: session.preset_name,
            started_at_ms: session.started_at_ms,
            duration_ms: session.duration_ms,
            trigger_count: session.trigger_count,
            mappings: session
                .mappings
                .into_iter()
                .map(SessionMappingStatDto::from)
                .collect(),
        }
    }
}

/// A session the overlay has just finished, on its way into the patient's history. The preset
/// name and mapping settings are not carried here; they are snapshotted natively.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CompletedSessionDto {
    pub session_id: String,
    pub patient_id: String,
    pub preset_id: String,
    pub started_at_ms: i64,
    pub ended_at_ms: i64,
    pub trigger_counts_by_mapping: HashMap<String, u32>,
}
