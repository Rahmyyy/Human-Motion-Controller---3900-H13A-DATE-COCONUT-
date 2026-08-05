use tauri::State;

use super::service::{self, ImportedPatientSummary};
use crate::db::DbState;

#[tauri::command]
pub fn export_patient(
    state: State<'_, DbState>,
    patient_id: String,
    file_path: String,
) -> Result<(), String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::export_patient(&conn, &patient_id, &file_path).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn preview_import_patient(file_path: String) -> Result<String, String> {
    service::preview_import(&file_path).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn import_patient(
    state: State<'_, DbState>,
    file_path: String,
) -> Result<ImportedPatientSummary, String> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::import_patient(&mut conn, &file_path).map_err(|error| error.to_string())
}
