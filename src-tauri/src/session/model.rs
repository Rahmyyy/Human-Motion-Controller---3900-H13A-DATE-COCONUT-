/// A completed session as stored in `sessions`.
pub struct Session {
    pub id: String,
    pub patient_id: String,
    pub preset_id: String,
    pub preset_name: String,
    pub started_at_ms: i64,
    pub ended_at_ms: i64,
    pub duration_ms: i64,
    pub trigger_count: i64,
}

/// A completed session's per-mapping row in `session_mapping_stats`.
pub struct SessionMappingStat {
    pub mapping_id: String,
    pub mapping_name: String,
    pub keybind: String,
    pub threshold_percentage: u32,
    pub keypress_trigger_threshold_percentage: u32,
    pub trigger_count: i64,
}

/// A completed session with the mapping settings it ran with, as the history page reads it.
pub struct PatientSession {
    pub id: String,
    pub preset_id: String,
    pub preset_name: String,
    pub started_at_ms: i64,
    pub duration_ms: i64,
    pub trigger_count: i64,
    pub mappings: Vec<SessionMappingStat>,
}

/// Live mapping settings captured when a session ends.
pub struct MappingSnapshot {
    pub id: String,
    pub name: String,
    pub keybind: String,
    pub threshold_percentage: u32,
    pub keypress_trigger_threshold_percentage: u32,
}
