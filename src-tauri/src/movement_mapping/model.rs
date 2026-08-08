#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MovementMappingSummary {
    pub id: String,
    pub name: String,
    pub keybind: String,
    pub keypress_type: String,
    pub pose_frames_json: String,
    pub selected_landmarks: Vec<u32>,
    pub threshold_percentage: u32,
    pub keypress_trigger_threshold_percentage: u32,
}

#[derive(serde::Serialize)]
pub struct MovementMappingDetails {
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

/// Invalid legacy values are treated like an empty "all tracked landmarks" selection.
pub(super) fn parse_selected_landmarks(raw: String) -> Vec<u32> {
    serde_json::from_str::<Vec<u32>>(&raw).unwrap_or_default()
}
