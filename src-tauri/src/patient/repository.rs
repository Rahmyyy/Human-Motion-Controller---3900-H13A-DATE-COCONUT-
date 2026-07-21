use anyhow::Result;
use rusqlite::{params, Connection};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Patient {
    pub id: String,
    pub display_name: String,
    pub clinical_notes: Option<String>,
    pub created_at: String,
}

pub fn insert_patient(
    conn: &Connection,
    id: &str,
    display_name: &str,
    clinical_notes: Option<&str>,
    created_at: &str,
) -> Result<()> {
    conn.execute(
        "
        INSERT INTO patients (
            id,
            display_name,
            clinical_notes,
            created_at
        ) VALUES (?1, ?2, ?3, ?4)
        ",
        params![id, display_name, clinical_notes, created_at],
    )?;

    Ok(())
}

pub fn select_patients(conn: &Connection) -> Result<Vec<Patient>> {
    let mut statement = conn.prepare(
        "
        SELECT id, display_name, clinical_notes, created_at
        FROM patients
        ORDER BY created_at DESC
        ",
    )?;

    let patients = statement
        .query_map([], |row| {
            Ok(Patient {
                id: row.get(0)?,
                display_name: row.get(1)?,
                clinical_notes: row.get(2)?,
                created_at: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(patients)
}

pub fn select_patient_by_id(conn: &Connection, id: &str) -> Result<Patient> {
    let mut statement = conn.prepare(
        "
        SELECT id, display_name, clinical_notes, created_at
        FROM patients
        WHERE id = ?1
        ",
    )?;

    let patient = statement.query_row(params![id], |row| {
        Ok(Patient {
            id: row.get(0)?,
            display_name: row.get(1)?,
            clinical_notes: row.get(2)?,
            created_at: row.get(3)?,
        })
    })?;

    Ok(patient)
}
