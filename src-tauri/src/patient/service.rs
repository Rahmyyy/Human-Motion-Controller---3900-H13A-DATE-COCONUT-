use super::repository::{self, Patient};
use anyhow::{anyhow, Result};
use rusqlite::Connection;
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_PATIENT_DISPLAY_NAME_LENGTH: usize = 60;
const MAX_CLINICAL_NOTES_LENGTH: usize = 500;

pub fn create_patient(
    conn: &Connection,
    display_name: &str,
    clinical_notes: Option<&str>,
    status: &str,
) -> Result<Patient> {
    let (display_name, clinical_notes) = validate_patient_details(display_name, clinical_notes)?;
    let status = validate_status(status)?;

    let now = SystemTime::now().duration_since(UNIX_EPOCH)?;
    let id = format!("patient-{}", now.as_nanos());
    let created_at = now.as_secs().to_string();

    let last_activity_at_ms = i64::try_from(now.as_millis())?;

    repository::insert_patient(
        conn,
        &id,
        display_name,
        clinical_notes,
        &created_at,
        status,
        last_activity_at_ms,
    )?;
    repository::select_patient_by_id(conn, &id)
}

pub fn get_patients(conn: &Connection) -> Result<Vec<Patient>> {
    repository::select_patients(conn)
}

pub fn get_patient(conn: &Connection, id: &str) -> Result<Patient> {
    if id.trim().is_empty() {
        return Err(anyhow!("Patient ID cannot be empty"));
    }

    repository::select_patient_by_id(conn, id)
}

pub fn update_patient(
    conn: &Connection,
    id: &str,
    display_name: &str,
    clinical_notes: Option<&str>,
    status: &str,
) -> Result<Patient> {
    if id.trim().is_empty() {
        return Err(anyhow!("Patient ID cannot be empty"));
    }

    let (display_name, clinical_notes) = validate_patient_details(display_name, clinical_notes)?;
    let status = validate_status(status)?;

    let rows_affected = repository::update_patient(conn, id, display_name, clinical_notes, status)?;

    if rows_affected == 0 {
        return Err(anyhow!("Patient not found"));
    }

    repository::select_patient_by_id(conn, id)
}

pub fn touch_patient_activity(conn: &Connection, id: &str) -> Result<()> {
    if id.trim().is_empty() {
        return Err(anyhow!("Patient ID cannot be empty"));
    }

    let now = SystemTime::now().duration_since(UNIX_EPOCH)?;
    let rows_affected =
        repository::touch_patient_activity(conn, id, i64::try_from(now.as_millis())?)?;
    if rows_affected == 0 {
        return Err(anyhow!("Patient not found"));
    }
    Ok(())
}

pub fn delete_patient(conn: &Connection, id: &str) -> Result<()> {
    if id.trim().is_empty() {
        return Err(anyhow!("Patient ID cannot be empty"));
    }

    let rows_affected = repository::delete_patient(conn, id)?;

    if rows_affected == 0 {
        return Err(anyhow!("Patient not found"));
    }

    Ok(())
}

fn validate_patient_details<'a>(
    display_name: &'a str,
    clinical_notes: Option<&'a str>,
) -> Result<(&'a str, Option<&'a str>)> {
    let display_name = display_name.trim();

    if display_name.is_empty() {
        return Err(anyhow!("Patient display name cannot be empty"));
    }

    if display_name.chars().count() > MAX_PATIENT_DISPLAY_NAME_LENGTH {
        return Err(anyhow!(
            "Patient display name cannot exceed {MAX_PATIENT_DISPLAY_NAME_LENGTH} characters"
        ));
    }

    let clinical_notes = clinical_notes
        .map(str::trim)
        .filter(|notes| !notes.is_empty());

    if let Some(notes) = clinical_notes {
        if notes.chars().count() > MAX_CLINICAL_NOTES_LENGTH {
            return Err(anyhow!(
                "Clinical notes cannot exceed {MAX_CLINICAL_NOTES_LENGTH} characters"
            ));
        }
    }

    Ok((display_name, clinical_notes))
}

fn validate_status(status: &str) -> Result<&str> {
    match status {
        "active" | "needsReview" => Ok(status),
        _ => Err(anyhow!("Patient status must be active or needsReview")),
    }
}

#[cfg(test)]
#[path = "service_tests.rs"]
mod tests;
