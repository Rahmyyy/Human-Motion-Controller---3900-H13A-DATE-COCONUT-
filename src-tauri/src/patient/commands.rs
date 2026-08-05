use tauri::State;

use super::service;

use crate::{
    db::DbState,
    native::{contract::PatientDto, error::NativeError},
};

#[tauri::command]
pub fn create_patient(
    state: State<'_, DbState>,
    display_name: String,
    clinical_notes: Option<String>,
) -> Result<PatientDto, NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::create_patient(&conn, &display_name, clinical_notes.as_deref())
        .map(PatientDto::from)
        .map_err(|error| NativeError::operation("patient_create_failed", error))
}

#[tauri::command]
pub fn get_patients(state: State<'_, DbState>) -> Result<Vec<PatientDto>, NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::get_patients(&conn)
        .map(|patients| patients.into_iter().map(PatientDto::from).collect())
        .map_err(|error| NativeError::operation("patient_list_failed", error))
}

#[tauri::command]
pub fn get_patient(state: State<'_, DbState>, id: String) -> Result<PatientDto, NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::get_patient(&conn, &id)
        .map(PatientDto::from)
        .map_err(|error| NativeError::operation("patient_get_failed", error))
}

#[tauri::command]
pub fn update_patient(
    state: State<'_, DbState>,
    id: String,
    display_name: String,
    clinical_notes: Option<String>,
) -> Result<PatientDto, NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::update_patient(
        &conn,
        &id,
        &display_name,
        clinical_notes.as_deref(),
    )
    .map(PatientDto::from)
    .map_err(|error| {
        NativeError::operation("patient_update_failed", error)
    })
}

#[tauri::command]
pub fn delete_patient(
    state: State<'_, DbState>,
    id: String,
) -> Result<(), NativeError> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| NativeError::database_lock())?;

    service::delete_patient(&conn, &id)
        .map_err(|error| {
            NativeError::operation("patient_delete_failed", error)
        })
}
