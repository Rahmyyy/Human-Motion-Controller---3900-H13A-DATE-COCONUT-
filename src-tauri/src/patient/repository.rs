use anyhow::Result;
use rusqlite::{params, Connection};

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Patient {
    pub id: String,
    pub display_name: String,
    pub clinical_notes: Option<String>,
    pub created_at: String,
    pub preset_count: i64,
    pub status: String,
    pub last_activity_at_ms: i64,
}

pub fn insert_patient(
    conn: &Connection,
    id: &str,
    display_name: &str,
    clinical_notes: Option<&str>,
    created_at: &str,
    status: &str,
    last_activity_at_ms: i64,
) -> Result<()> {
    conn.execute(
        "
        INSERT INTO patients (
            id,
            display_name,
            clinical_notes,
            created_at,
            status,
            last_activity_at_ms
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ",
        params![
            id,
            display_name,
            clinical_notes,
            created_at,
            status,
            last_activity_at_ms
        ],
    )?;

    Ok(())
}

pub fn select_patients(conn: &Connection) -> Result<Vec<Patient>> {
    let mut statement = conn.prepare(
        "
        SELECT
            patients.id,
            patients.display_name,
            patients.clinical_notes,
            patients.created_at,
            COUNT(presets.id),
            patients.status,
            patients.last_activity_at_ms
        FROM patients
        LEFT JOIN presets ON presets.patient_id = patients.id
        GROUP BY
            patients.id,
            patients.display_name,
            patients.clinical_notes,
            patients.created_at,
            patients.status,
            patients.last_activity_at_ms
        ORDER BY patients.last_activity_at_ms DESC, patients.created_at DESC
        ",
    )?;

    let patients = statement
        .query_map([], |row| {
            Ok(Patient {
                id: row.get(0)?,
                display_name: row.get(1)?,
                clinical_notes: row.get(2)?,
                created_at: row.get(3)?,
                preset_count: row.get(4)?,
                status: row.get(5)?,
                last_activity_at_ms: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(patients)
}

pub fn select_patient_by_id(conn: &Connection, id: &str) -> Result<Patient> {
    let mut statement = conn.prepare(
        "
        SELECT
            patients.id,
            patients.display_name,
            patients.clinical_notes,
            patients.created_at,
            COUNT(presets.id),
            patients.status,
            patients.last_activity_at_ms
        FROM patients
        LEFT JOIN presets ON presets.patient_id = patients.id
        WHERE patients.id = ?1
        GROUP BY
            patients.id,
            patients.display_name,
            patients.clinical_notes,
            patients.created_at,
            patients.status,
            patients.last_activity_at_ms
        ",
    )?;

    Ok(statement.query_row(params![id], |row| {
        Ok(Patient {
            id: row.get(0)?,
            display_name: row.get(1)?,
            clinical_notes: row.get(2)?,
            created_at: row.get(3)?,
            preset_count: row.get(4)?,
            status: row.get(5)?,
            last_activity_at_ms: row.get(6)?,
        })
    })?)
}

pub fn update_patient(
    conn: &Connection,
    id: &str,
    display_name: &str,
    clinical_notes: Option<&str>,
    status: &str,
) -> Result<usize> {
    let rows_affected = conn.execute(
        "
        UPDATE patients
        SET display_name = ?1, clinical_notes = ?2, status = ?3
        WHERE id = ?4
        ",
        params![display_name, clinical_notes, status, id],
    )?;

    Ok(rows_affected)
}

pub fn touch_patient_activity(conn: &Connection, id: &str, occurred_at_ms: i64) -> Result<usize> {
    let rows_affected = conn.execute(
        "UPDATE patients SET last_activity_at_ms = MAX(last_activity_at_ms, ?1) WHERE id = ?2",
        params![occurred_at_ms, id],
    )?;
    Ok(rows_affected)
}

pub fn delete_patient(conn: &Connection, id: &str) -> Result<usize> {
    let rows_affected = conn.execute("DELETE FROM patients WHERE id = ?1", params![id])?;

    Ok(rows_affected)
}
