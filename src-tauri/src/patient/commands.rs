use tauri::State;

use super::{repository::Patient, service};

use crate::db::DbState;

#[tauri::command]
pub fn create_patient(
    state: State<'_, DbState>,
    display_name: String,
    clinical_notes: Option<String>,
) -> Result<Patient, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::create_patient(&conn, &display_name, clinical_notes.as_deref())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_patients(state: State<'_, DbState>) -> Result<Vec<Patient>, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::get_patients(&conn).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_patient(state: State<'_, DbState>, id: String) -> Result<Patient, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "failed to lock database connection".to_string())?;

    service::get_patient(&conn, &id).map_err(|error| error.to_string())
}
