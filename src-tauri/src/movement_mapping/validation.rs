use anyhow::{anyhow, Result};

// Keep this list in sync with TRACKED_LANDMARKS on the frontend.
const TRACKED_LANDMARKS: [u32; 12] = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
const MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE: u32 = 30;
const MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE: u32 = 100;

/// An empty selection is stored as `[]` and means "all tracked landmarks" downstream.
pub(super) fn serialize_selected_landmarks(selected: &[u32]) -> Result<String> {
    if let Some(invalid) = selected
        .iter()
        .find(|index| !TRACKED_LANDMARKS.contains(index))
    {
        return Err(anyhow!("Invalid landmark index: {invalid}"));
    }

    Ok(serde_json::to_string(selected)?)
}

pub(super) fn validate_keypress_trigger_threshold(threshold_percentage: u32) -> Result<()> {
    if !(MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE..=MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE)
        .contains(&threshold_percentage)
    {
        return Err(anyhow!(
            "Keypress trigger threshold must be between 30 and 100"
        ));
    }

    Ok(())
}

pub(super) fn validate_keypress_type(keypress_type: &str) -> Result<()> {
    match keypress_type.trim() {
        "Toggle" | "Press" | "Release" | "Click" => Ok(()),
        _ => Err(anyhow!(
            "Keypress type must be one of Toggle, Press, Release, or Click"
        )),
    }
}
