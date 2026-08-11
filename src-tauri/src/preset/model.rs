#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Preset {
    pub id: String,
    pub patient_id: String,
    pub name: String,
    pub created_at: String,
    pub mapping_count: i64,
    pub default_pose_frames_json: Option<String>,
}
