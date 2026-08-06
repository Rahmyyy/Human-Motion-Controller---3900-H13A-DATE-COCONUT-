use tauri::State;

use super::service;
use crate::{
    db::DbState,
    native::{contract::PatientDto, error::NativeError},
};

#[tauri::command]
pub fn export_patient(
    state: State<'_, DbState>,
    patient_id: String,
    file_path: String,
) -> Result<(), NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::export_patient(&conn, &patient_id, &file_path)
        .map_err(|error| NativeError::operation("patient_export_failed", error))
}

#[tauri::command]
pub fn preview_import_patient(file_path: String) -> Result<String, NativeError> {
    service::preview_import(&file_path)
        .map_err(|error| NativeError::operation("patient_import_preview_failed", error))
}

#[tauri::command]
pub fn import_patient(
    state: State<'_, DbState>,
    file_path: String,
) -> Result<PatientDto, NativeError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::import_patient(&mut conn, &file_path)
        .map(PatientDto::from)
        .map_err(|error| NativeError::operation("patient_import_failed", error))
}
