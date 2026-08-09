use tauri::State;

use super::service;
use crate::{
    db::DbState,
    native::{
        contract::{DashboardOverviewDto, ScheduledSessionDto},
        error::NativeError,
    },
};

#[tauri::command]
pub fn create_scheduled_session(
    state: State<'_, DbState>,
    patient_id: String,
    scheduled_at_ms: i64,
) -> Result<ScheduledSessionDto, NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::create_scheduled_session(&conn, &patient_id, scheduled_at_ms)
        .map(ScheduledSessionDto::from)
        .map_err(|error| NativeError::operation("scheduled_session_create_failed", error))
}

#[tauri::command]
pub fn get_dashboard_overview(
    state: State<'_, DbState>,
    day_start_ms: i64,
    day_end_ms: i64,
) -> Result<DashboardOverviewDto, NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::get_dashboard_overview(&conn, day_start_ms, day_end_ms)
        .map(DashboardOverviewDto::from)
        .map_err(|error| NativeError::operation("dashboard_overview_get_failed", error))
}
