use anyhow::Result;
use rusqlite::{params, Connection};
use std::collections::HashMap;

/// A completed session as stored in `sessions`.
pub struct Session {
    pub id: String,
    pub patient_id: String,
    pub preset_id: String,
    pub preset_name: String,
    pub started_at_ms: i64,
    pub ended_at_ms: i64,
    pub duration_ms: i64,
    pub trigger_count: i64,
}

/// A completed session's per-mapping row in `session_mapping_stats`.
pub struct SessionMappingStat {
    pub mapping_id: String,
    pub mapping_name: String,
    pub keybind: String,
    pub threshold_percentage: u32,
    pub keypress_trigger_threshold_percentage: u32,
    pub trigger_count: i64,
}

/// A completed session with the mapping settings it ran with, as the history page reads it.
pub struct PatientSession {
    pub id: String,
    pub preset_id: String,
    pub preset_name: String,
    pub started_at_ms: i64,
    pub duration_ms: i64,
    pub trigger_count: i64,
    pub mappings: Vec<SessionMappingStat>,
}

/// The mapping settings a session ran with, read from the live tables at the moment the
/// session ends so they can be frozen into `session_mapping_stats`.
pub struct MappingSnapshot {
    pub id: String,
    pub name: String,
    pub keybind: String,
    pub threshold_percentage: u32,
    pub keypress_trigger_threshold_percentage: u32,
}

/// Writes the session and its per-mapping rows together: a session row without its
/// breakdown would render as a history entry with no activity behind it.
pub fn insert_session(
    conn: &mut Connection,
    session: &Session,
    stats: &[SessionMappingStat],
) -> Result<()> {
    let transaction = conn.transaction()?;

    transaction.execute(
        "
        INSERT INTO sessions (
            id,
            patient_id,
            preset_id,
            preset_name,
            started_at_ms,
            ended_at_ms,
            duration_ms,
            trigger_count
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ",
        params![
            session.id,
            session.patient_id,
            session.preset_id,
            session.preset_name,
            session.started_at_ms,
            session.ended_at_ms,
            session.duration_ms,
            session.trigger_count,
        ],
    )?;

    for stat in stats {
        transaction.execute(
            "
            INSERT INTO session_mapping_stats (
                session_id,
                mapping_id,
                mapping_name,
                keybind,
                threshold_percentage,
                keypress_trigger_threshold_percentage,
                trigger_count
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ",
            params![
                session.id,
                stat.mapping_id,
                stat.mapping_name,
                stat.keybind,
                stat.threshold_percentage,
                stat.keypress_trigger_threshold_percentage,
                stat.trigger_count,
            ],
        )?;
    }

    transaction.commit()?;
    Ok(())
}

pub fn session_exists(conn: &Connection, id: &str) -> Result<bool> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sessions WHERE id = ?1",
        params![id],
        |row| row.get(0),
    )?;

    Ok(count > 0)
}

/// Reads the preset's current mapping settings so the service can snapshot them.
pub fn select_mapping_snapshots(
    conn: &Connection,
    preset_id: &str,
) -> Result<Vec<MappingSnapshot>> {
    let mut statement = conn.prepare(
        "
        SELECT id, name, keybind, threshold_percentage, keypress_trigger_threshold_percentage
        FROM movement_mappings
        WHERE preset_id = ?1
        ORDER BY created_at ASC
        ",
    )?;

    let snapshots = statement
        .query_map(params![preset_id], |row| {
            Ok(MappingSnapshot {
                id: row.get(0)?,
                name: row.get(1)?,
                keybind: row.get(2)?,
                threshold_percentage: row.get(3)?,
                keypress_trigger_threshold_percentage: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(snapshots)
}

/// Every completed session for a patient, newest first, each carrying the mapping rows it was
/// recorded with.
///
/// Two flat reads rather than one join: joining would repeat all six session columns once per
/// mapping row, and detecting where one session's rows end would land in this layer anyway.
pub fn select_patient_sessions(conn: &Connection, patient_id: &str) -> Result<Vec<PatientSession>> {
    let mut stats_by_session = select_mapping_stats_by_session(conn, patient_id)?;

    // Served by idx_sessions_patient_started_at.
    let mut statement = conn.prepare(
        "
        SELECT id, preset_id, preset_name, started_at_ms, duration_ms, trigger_count
        FROM sessions
        WHERE patient_id = ?1
        ORDER BY started_at_ms DESC
        ",
    )?;

    let rows = statement
        .query_map(params![patient_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, i64>(4)?,
                row.get::<_, i64>(5)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(rows
        .into_iter()
        .map(
            |(id, preset_id, preset_name, started_at_ms, duration_ms, trigger_count)| {
                // `remove` rather than `get`: each session owns its rows, so there is nothing to clone.
                let mappings = stats_by_session.remove(&id).unwrap_or_default();
                PatientSession {
                    id,
                    preset_id,
                    preset_name,
                    started_at_ms,
                    duration_ms,
                    trigger_count,
                    mappings,
                }
            },
        )
        .collect())
}

/// Every mapping row belonging to the patient's sessions, keyed by session. One pass, so reading
/// a patient's history never costs a query per session.
fn select_mapping_stats_by_session(
    conn: &Connection,
    patient_id: &str,
) -> Result<HashMap<String, Vec<SessionMappingStat>>> {
    let mut statement = conn.prepare(
        "
        SELECT stats.session_id, stats.mapping_id, stats.mapping_name, stats.keybind,
            stats.threshold_percentage, stats.keypress_trigger_threshold_percentage,
            stats.trigger_count
        FROM session_mapping_stats AS stats
        JOIN sessions ON sessions.id = stats.session_id
        WHERE sessions.patient_id = ?1
        ORDER BY stats.mapping_name ASC
        ",
    )?;

    let rows = statement
        .query_map(params![patient_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                SessionMappingStat {
                    mapping_id: row.get(1)?,
                    mapping_name: row.get(2)?,
                    keybind: row.get(3)?,
                    threshold_percentage: row.get(4)?,
                    keypress_trigger_threshold_percentage: row.get(5)?,
                    trigger_count: row.get(6)?,
                },
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut stats_by_session: HashMap<String, Vec<SessionMappingStat>> = HashMap::new();
    for (session_id, stat) in rows {
        stats_by_session.entry(session_id).or_default().push(stat);
    }

    Ok(stats_by_session)
}
