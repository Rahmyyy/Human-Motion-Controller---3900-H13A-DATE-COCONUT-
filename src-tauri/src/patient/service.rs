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
) -> Result<Patient> {
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

    let now = SystemTime::now().duration_since(UNIX_EPOCH)?;
    let id = format!("patient-{}", now.as_nanos());
    let created_at = now.as_secs().to_string();

    repository::insert_patient(conn, &id, display_name, clinical_notes, &created_at)?;
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
