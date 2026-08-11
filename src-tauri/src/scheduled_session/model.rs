#[derive(Debug)]
pub struct ScheduledSession {
    pub id: String,
    pub patient_id: String,
    pub patient_display_name: String,
    pub scheduled_at_ms: i64,
}

#[derive(Debug)]
pub struct DashboardOverview {
    pub active_patient_count: i64,
    pub sessions_today_count: i64,
    pub todays_schedule: Vec<ScheduledSession>,
}
