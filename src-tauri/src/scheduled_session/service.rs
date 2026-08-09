use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::{anyhow, Result};
use rusqlite::Connection;

use super::repository::{self, DashboardOverview, ScheduledSession};

pub fn create_scheduled_session(
    conn: &Connection,
    patient_id: &str,
    scheduled_at_ms: i64,
) -> Result<ScheduledSession> {
    let patient_id = patient_id.trim();
    if patient_id.is_empty() {
        return Err(anyhow!("Patient ID cannot be empty"));
    }
    if !repository::patient_exists(conn, patient_id)? {
        return Err(anyhow!("Patient not found"));
    }

    let now = SystemTime::now().duration_since(UNIX_EPOCH)?;
    let now_ms = i64::try_from(now.as_millis())?;
    if scheduled_at_ms <= now_ms {
        return Err(anyhow!("Scheduled session must be in the future"));
    }

    let id = format!("scheduled-session-{}", now.as_nanos());
    repository::insert_scheduled_session(conn, &id, patient_id, scheduled_at_ms, now_ms)?;
    repository::select_scheduled_session_by_id(conn, &id)
}

pub fn get_dashboard_overview(
    conn: &Connection,
    day_start_ms: i64,
    day_end_ms: i64,
) -> Result<DashboardOverview> {
    if day_end_ms <= day_start_ms {
        return Err(anyhow!("Day end must be after day start"));
    }

    repository::select_dashboard_overview(conn, day_start_ms, day_end_ms)
}
