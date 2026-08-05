use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::{movement_mapping::repository, patient, preset, scheduled_session};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PatientDto {
    pub id: String,
    pub display_name: String,
    pub clinical_notes: Option<String>,
    pub created_at: String,
}

impl From<patient::repository::Patient> for PatientDto {
    fn from(patient: patient::repository::Patient) -> Self {
        Self {
            id: patient.id,
            display_name: patient.display_name,
            clinical_notes: patient.clinical_notes,
            created_at: patient.created_at,
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

impl From<repository::MovementMappingSummary> for MovementMappingSummaryDto {
    fn from(mapping: repository::MovementMappingSummary) -> Self {
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

impl From<repository::MovementMappingDetails> for MovementMappingDetailsDto {
    fn from(mapping: repository::MovementMappingDetails) -> Self {
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
