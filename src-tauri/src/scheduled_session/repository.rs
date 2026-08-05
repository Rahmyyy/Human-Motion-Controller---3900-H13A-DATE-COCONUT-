use anyhow::Result;
use rusqlite::{params, Connection};

#[derive(Debug)]
pub struct ScheduledSession {
    pub id: String,
    pub patient_id: String,
    pub patient_display_name: String,
    pub scheduled_at_ms: i64,
}

#[derive(Debug)]
pub struct DashboardOverview {
    pub active_patient_count: i64,
    pub sessions_today_count: i64,
    pub todays_schedule: Vec<ScheduledSession>,
}

pub fn patient_exists(conn: &Connection, patient_id: &str) -> Result<bool> {
    let count = conn.query_row(
        "SELECT COUNT(*) FROM patients WHERE id = ?1",
        params![patient_id],
        |row| row.get::<_, i64>(0),
    )?;

    Ok(count > 0)
}

pub fn insert_scheduled_session(
    conn: &Connection,
    id: &str,
    patient_id: &str,
    scheduled_at_ms: i64,
    created_at_ms: i64,
) -> Result<()> {
    conn.execute(
        "
        INSERT INTO scheduled_sessions (id, patient_id, scheduled_at_ms, created_at_ms)
        VALUES (?1, ?2, ?3, ?4)
        ",
        params![id, patient_id, scheduled_at_ms, created_at_ms],
    )?;

    Ok(())
}

pub fn select_scheduled_session_by_id(conn: &Connection, id: &str) -> Result<ScheduledSession> {
    conn.query_row(
        "
        SELECT scheduled_sessions.id, scheduled_sessions.patient_id,
               patients.display_name, scheduled_sessions.scheduled_at_ms
        FROM scheduled_sessions
        JOIN patients ON patients.id = scheduled_sessions.patient_id
        WHERE scheduled_sessions.id = ?1
        ",
        params![id],
        scheduled_session_from_row,
    )
    .map_err(Into::into)
}

pub fn select_dashboard_overview(
    conn: &Connection,
    day_start_ms: i64,
    day_end_ms: i64,
) -> Result<DashboardOverview> {
    let active_patient_count = conn.query_row("SELECT COUNT(*) FROM patients", [], |row| {
        row.get::<_, i64>(0)
    })?;
    let sessions_today_count = conn.query_row(
        "
        SELECT COUNT(*)
        FROM scheduled_sessions
        WHERE scheduled_at_ms >= ?1 AND scheduled_at_ms < ?2
        ",
        params![day_start_ms, day_end_ms],
        |row| row.get::<_, i64>(0),
    )?;

    let mut statement = conn.prepare(
        "
        SELECT scheduled_sessions.id, scheduled_sessions.patient_id,
               patients.display_name, scheduled_sessions.scheduled_at_ms
        FROM scheduled_sessions
        JOIN patients ON patients.id = scheduled_sessions.patient_id
        WHERE scheduled_sessions.scheduled_at_ms >= ?1
          AND scheduled_sessions.scheduled_at_ms < ?2
        ORDER BY scheduled_sessions.scheduled_at_ms ASC, scheduled_sessions.id ASC
        ",
    )?;
    let todays_schedule = statement
        .query_map(
            params![day_start_ms, day_end_ms],
            scheduled_session_from_row,
        )?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(DashboardOverview {
        active_patient_count,
        sessions_today_count,
        todays_schedule,
    })
}

fn scheduled_session_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<ScheduledSession> {
    Ok(ScheduledSession {
        id: row.get(0)?,
        patient_id: row.get(1)?,
        patient_display_name: row.get(2)?,
        scheduled_at_ms: row.get(3)?,
    })
}
