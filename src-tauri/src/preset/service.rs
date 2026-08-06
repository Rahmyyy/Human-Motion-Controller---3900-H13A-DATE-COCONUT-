use super::repository::{self, Preset};
use anyhow::{anyhow, Result};
use rusqlite::Connection;
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_PRESET_NAME_LENGTH: usize = 60;

pub fn create_preset(conn: &Connection, patient_id: &str, name: &str) -> Result<Preset> {
    let patient_id = patient_id.trim();

    if patient_id.is_empty() {
        return Err(anyhow!("Patient ID cannot be empty"));
    }

    let name = name.trim();

    if name.is_empty() {
        return Err(anyhow!("Preset name cannot be empty"));
    }

    if name.chars().count() > MAX_PRESET_NAME_LENGTH {
        return Err(anyhow!(
            "Preset name cannot exceed {MAX_PRESET_NAME_LENGTH} characters"
        ));
    }

    let now = SystemTime::now().duration_since(UNIX_EPOCH)?;
    let id = format!("preset-{}", now.as_nanos());
    let created_at = now.as_secs().to_string();

    repository::insert_preset(conn, &id, patient_id, name, &created_at)?;
    crate::patient::repository::touch_patient_activity(
        conn,
        patient_id,
        i64::try_from(now.as_millis())?,
    )?;
    repository::select_preset_by_id(conn, &id, patient_id)
}

pub fn get_presets(conn: &Connection, patient_id: &str) -> Result<Vec<Preset>> {
    let patient_id = patient_id.trim();

    if patient_id.is_empty() {
        return Err(anyhow!("Patient ID cannot be empty"));
    }

    repository::select_presets_by_patient(conn, patient_id)
}

pub fn get_preset(conn: &Connection, id: &str, patient_id: &str) -> Result<Preset> {
    let id = id.trim();
    let patient_id = patient_id.trim();

    if id.is_empty() {
        return Err(anyhow!("Preset ID cannot be empty"));
    }

    if patient_id.is_empty() {
        return Err(anyhow!("Patient ID cannot be empty"));
    }

    repository::select_preset_by_id(conn, id, patient_id)
}

pub fn duplicate_preset(conn: &mut Connection, source_id: &str) -> Result<Preset> {
    if source_id.trim().is_empty() {
        return Err(anyhow!("Preset ID cannot be empty"));
    }

    let source = repository::select_preset_by_id_any_patient(conn, source_id)?;
    let suffix = " (Copy)";
    let available_characters = MAX_PRESET_NAME_LENGTH - suffix.chars().count();
    let duplicate_name = format!(
        "{}{}",
        source
            .name
            .chars()
            .take(available_characters)
            .collect::<String>(),
        suffix
    );
    let now = SystemTime::now().duration_since(UNIX_EPOCH)?;
    let duplicate_id = format!("preset-{}", now.as_nanos());
    let created_at = now.as_secs().to_string();

    repository::duplicate_preset_data(
        conn,
        source_id,
        &duplicate_id,
        &duplicate_name,
        &created_at,
        source.default_pose_frames_json.as_deref(),
        &source.patient_id,
    )?;
    crate::patient::repository::touch_patient_activity(
        conn,
        &source.patient_id,
        i64::try_from(now.as_millis())?,
    )?;
    repository::select_preset_by_id(conn, &duplicate_id, &source.patient_id)
}

pub fn delete_preset(conn: &Connection, id: &str) -> Result<()> {
    if id.trim().is_empty() {
        return Err(anyhow!("Preset ID cannot be empty"));
    }

    let rows_affected = repository::delete_preset(conn, id)?;
    if rows_affected == 0 {
        return Err(anyhow!("Preset not found"));
    }

    Ok(())
}

pub fn update_default_pose(
    conn: &Connection,
    id: &str,
    patient_id: &str,
    default_pose_frames_json: &str,
) -> Result<Preset> {
    let id = id.trim();
    let patient_id = patient_id.trim();

    if id.is_empty() {
        return Err(anyhow!("Preset ID cannot be empty"));
    }

    if patient_id.is_empty() {
        return Err(anyhow!("Patient ID cannot be empty"));
    }

    let parsed_frames: serde_json::Value = serde_json::from_str(default_pose_frames_json)
        .map_err(|_| anyhow!("Default pose frames must be valid JSON"))?;
    let frame_count = parsed_frames
        .as_array()
        .map(Vec::len)
        .ok_or_else(|| anyhow!("Default pose frames must be a JSON array"))?;

    if frame_count < 2 {
        return Err(anyhow!("Default pose must contain at least two frames"));
    }

    let rows_affected = repository::update_default_pose_frames(conn, id, default_pose_frames_json)?;
    if rows_affected == 0 {
        return Err(anyhow!("Preset not found"));
    }

    repository::select_preset_by_id(conn, id, patient_id)
}

#[cfg(test)]
#[path = "service_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "duplication_tests.rs"]
mod duplication_tests;

#[cfg(test)]
#[path = "deletion_tests.rs"]
mod deletion_tests;
