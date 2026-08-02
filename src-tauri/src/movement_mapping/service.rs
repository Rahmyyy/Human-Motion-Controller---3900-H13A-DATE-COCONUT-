use super::repository::{self, MovementMappingDetails, MovementMappingSummary};
use anyhow::{anyhow, Result};
use rusqlite::Connection;
use std::time::{SystemTime, UNIX_EPOCH};

// The body landmarks recognition can track. Kept in sync with TRACKED_LANDMARKS on the frontend.
const TRACKED_LANDMARKS: [u32; 12] = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
const MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE: u32 = 30;
const MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE: u32 = 100;

/// Validate a landmark selection and encode it for storage. An empty selection is allowed and
/// stored as `[]` — downstream (and the frontend) treat that as "all tracked landmarks".
fn serialize_selected_landmarks(selected: &[u32]) -> Result<String> {
    if let Some(invalid) = selected
        .iter()
        .find(|index| !TRACKED_LANDMARKS.contains(index))
    {
        return Err(anyhow!("Invalid landmark index: {invalid}"));
    }

    Ok(serde_json::to_string(selected)?)
}

pub fn create_movement_mapping(
    conn: &Connection,
    preset_id: &str,
    name: &str,
    keybind: &str,
    keypress_type: &str,
    pose_frames_json: &str,
    selected_landmarks: &[u32],
    keypress_trigger_threshold_percentage: u32,
) -> Result<()> {
    let name = name.trim();
    let keybind = keybind.trim();
    let keypress_type = keypress_type.trim();

    if name.is_empty() {
        return Err(anyhow!("Movement mapping name cannot be empty"));
    }

    if keybind.is_empty() {
        return Err(anyhow!("Movement mapping keybind cannot be empty"));
    }

    if keypress_type.is_empty() {
        return Err(anyhow!("Movement mapping keypress type cannot be empty"));
    }

    validate_keypress_type(keypress_type)?;

    if pose_frames_json.trim().is_empty() {
        return Err(anyhow!("Movement mapping pose frames cannot be empty"));
    }

    let selected_landmarks_json = serialize_selected_landmarks(selected_landmarks)?;
    validate_keypress_trigger_threshold(keypress_trigger_threshold_percentage)?;

    if !repository::preset_has_default_pose(conn, preset_id)? {
        return Err(anyhow!(
            "Record a default resting pose before creating movement mappings"
        ));
    }

    let now = SystemTime::now().duration_since(UNIX_EPOCH)?;
    let id = format!("movement-mapping-{}", now.as_nanos());
    let created_at = now.as_secs().to_string();

    repository::insert_movement_mapping(
        conn,
        &repository::NewMovementMapping {
            id: &id,
            preset_id,
            name,
            keybind,
            keypress_type,
            pose_frames_json,
            selected_landmarks_json: &selected_landmarks_json,
            keypress_trigger_threshold_percentage,
            created_at: &created_at,
        },
    )?;

    Ok(())
}

pub fn get_movement_mappings(
    conn: &Connection,
    preset_id: &str,
) -> Result<Vec<MovementMappingSummary>> {
    repository::select_movement_mappings_by_preset(conn, preset_id)
}

pub fn get_movement_mapping(
    conn: &Connection,
    id: &str,
    preset_id: &str,
) -> Result<MovementMappingDetails> {
    repository::select_movement_mapping_by_id(conn, id, preset_id)
}

pub struct MovementMappingUpdate<'a> {
    pub id: &'a str,
    pub preset_id: &'a str,
    pub name: &'a str,
    pub keybind: &'a str,
    pub keypress_type: &'a str,
    pub pose_frames_json: &'a str,
    pub selected_landmarks: &'a [u32],
    pub keypress_trigger_threshold_percentage: u32,
}

pub fn update_movement_mapping(
    conn: &Connection,
    update: &MovementMappingUpdate<'_>,
) -> Result<()> {
    let name = update.name.trim();
    let keybind = update.keybind.trim();

    if name.is_empty() {
        return Err(anyhow!("Movement mapping name cannot be empty"));
    }

    if keybind.is_empty() {
        return Err(anyhow!("Movement mapping keybind cannot be empty"));
    }

    validate_keypress_type(update.keypress_type)?;

    if update.pose_frames_json.trim().is_empty() {
        return Err(anyhow!("Movement mapping pose frames cannot be empty"));
    }

    let selected_landmarks_json = serialize_selected_landmarks(update.selected_landmarks)?;
    validate_keypress_trigger_threshold(update.keypress_trigger_threshold_percentage)?;

    let rows_affected = repository::update_movement_mapping(
        conn,
        &repository::MovementMappingUpdate {
            id: update.id,
            preset_id: update.preset_id,
            name,
            keybind,
            keypress_type: update.keypress_type,
            pose_frames_json: update.pose_frames_json,
            selected_landmarks_json: &selected_landmarks_json,
            keypress_trigger_threshold_percentage: update.keypress_trigger_threshold_percentage,
        },
    )?;

    if rows_affected == 0 {
        return Err(anyhow!("Movement mapping not found"));
    }

    Ok(())
}

fn validate_keypress_trigger_threshold(threshold_percentage: u32) -> Result<()> {
    if !(MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE..=MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE)
        .contains(&threshold_percentage)
    {
        return Err(anyhow!(
            "Keypress trigger threshold must be between 30 and 100"
        ));
    }

    Ok(())
}

fn validate_keypress_type(keypress_type: &str) -> Result<()> {
    match keypress_type.trim() {
        "Toggle" | "Press" | "Release" | "Click" => Ok(()),
        _ => Err(anyhow!(
            "Keypress type must be one of Toggle, Press, Release, or Click"
        )),
    }
}

pub fn delete_movement_mapping(conn: &Connection, id: &str, preset_id: &str) -> Result<()> {
    let rows_affected = repository::delete_movement_mapping(conn, id, preset_id)?;

    if rows_affected == 0 {
        return Err(anyhow!("Movement mapping not found"));
    }

    Ok(())
}

pub fn update_movement_mapping_threshold(
    conn: &Connection,
    id: &str,
    preset_id: &str,
    threshold_percentage: u32,
) -> Result<()> {
    if !(1..=100).contains(&threshold_percentage) {
        return Err(anyhow!("Movement threshold must be between 1 and 100"));
    }

    let rows_affected =
        repository::update_movement_mapping_threshold(conn, id, preset_id, threshold_percentage)?;

    if rows_affected == 0 {
        return Err(anyhow!("Movement mapping not found"));
    }

    Ok(())
}

#[cfg(test)]
#[path = "service_tests.rs"]
mod tests;
