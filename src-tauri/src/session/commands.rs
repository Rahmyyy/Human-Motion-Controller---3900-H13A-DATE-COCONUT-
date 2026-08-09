use tauri::State;

use super::service::{self, CompletedSession};

use crate::{
    db::DbState,
    native::{
        contract::{CompletedSessionDto, PatientSessionDto},
        error::NativeError,
    },
};

#[tauri::command]
pub fn record_completed_session(
    state: State<'_, DbState>,
    session: CompletedSessionDto,
) -> Result<(), NativeError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::record_completed_session(
        &mut conn,
        &CompletedSession {
            session_id: &session.session_id,
            patient_id: &session.patient_id,
            preset_id: &session.preset_id,
            started_at_ms: session.started_at_ms,
            ended_at_ms: session.ended_at_ms,
            trigger_counts_by_mapping: &session.trigger_counts_by_mapping,
        },
    )
    .map_err(|error| NativeError::operation("session_record_failed", error))
}

#[tauri::command]
pub fn get_patient_sessions(
    state: State<'_, DbState>,
    patient_id: String,
) -> Result<Vec<PatientSessionDto>, NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::list_patient_sessions(&conn, &patient_id)
        .map(|sessions| sessions.into_iter().map(PatientSessionDto::from).collect())
        .map_err(|error| NativeError::operation("patient_sessions_read_failed", error))
}
