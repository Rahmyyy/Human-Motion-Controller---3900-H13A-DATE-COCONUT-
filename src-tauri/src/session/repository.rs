use anyhow::Result;
use rusqlite::{params, Connection};

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
