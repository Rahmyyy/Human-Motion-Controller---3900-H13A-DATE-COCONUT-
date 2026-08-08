use std::sync::Mutex;

use rusqlite::{params, Connection};
use tauri::{test::MockRuntime, App, Manager};

use super::*;
use crate::db::DbState;

pub(super) const TEST_PATIENT_ID: &str = "patient-1";
pub(super) const TEST_PRESET_ID: &str = "preset-1";
pub(super) const STARTED_AT_MS: i64 = 1_754_000_000_000;
pub(super) const DAY_MS: i64 = 86_400_000;

pub(super) struct StoredSession {
    pub preset_id: String,
    pub preset_name: String,
    pub started_at_ms: i64,
    pub ended_at_ms: i64,
    pub duration_ms: i64,
    pub trigger_count: i64,
}

pub(super) struct StoredStat {
    pub mapping_name: String,
    pub keybind: String,
    pub threshold_percentage: u32,
    pub keypress_trigger_threshold_percentage: u32,
    pub trigger_count: i64,
}

pub(super) fn completed_session<'a>(
    session_id: &'a str,
    ended_at_ms: i64,
    trigger_counts: &'a HashMap<String, u32>,
) -> service::CompletedSession<'a> {
    service::CompletedSession {
        session_id,
        patient_id: TEST_PATIENT_ID,
        preset_id: TEST_PRESET_ID,
        started_at_ms: STARTED_AT_MS,
        ended_at_ms,
        trigger_counts_by_mapping: trigger_counts,
    }
}

pub(super) fn insert_mapping(
    conn: &Connection,
    id: &str,
    name: &str,
    keypress_trigger_threshold: u32,
) {
    conn.execute(
        "INSERT INTO movement_mappings (
            id, preset_id, name, keybind, keypress_type, pose_frames_json,
            selected_landmarks_json, threshold_percentage,
            keypress_trigger_threshold_percentage, created_at
         ) VALUES (?1, ?2, ?3, ?4, 'Click', '[]', '[]', 100, ?5, ?6)",
        params![
            id,
            TEST_PRESET_ID,
            name,
            "A",
            keypress_trigger_threshold,
            id
        ],
    )
    .unwrap();
}

pub(super) fn set_movement_threshold(conn: &Connection, mapping_id: &str, percentage: u32) {
    conn.execute(
        "UPDATE movement_mappings SET threshold_percentage = ?1 WHERE id = ?2",
        params![percentage, mapping_id],
    )
    .unwrap();
}

pub(super) fn record_session_at(
    conn: &mut Connection,
    session_id: &str,
    started_at_ms: i64,
    trigger_counts: &HashMap<String, u32>,
) {
    service::record_completed_session(
        conn,
        &service::CompletedSession {
            started_at_ms,
            ended_at_ms: started_at_ms + 1_000,
            ..completed_session(session_id, started_at_ms + 1_000, trigger_counts)
        },
    )
    .unwrap();
}

pub(super) fn read_session(conn: &Connection, session_id: &str) -> StoredSession {
    conn.query_row(
        "SELECT preset_id, preset_name, started_at_ms, ended_at_ms, duration_ms, trigger_count
         FROM sessions WHERE id = ?1",
        params![session_id],
        |row| {
            Ok(StoredSession {
                preset_id: row.get(0)?,
                preset_name: row.get(1)?,
                started_at_ms: row.get(2)?,
                ended_at_ms: row.get(3)?,
                duration_ms: row.get(4)?,
                trigger_count: row.get(5)?,
            })
        },
    )
    .unwrap()
}

pub(super) fn read_stats(conn: &Connection, session_id: &str) -> Vec<StoredStat> {
    let mut statement = conn
        .prepare(
            "SELECT mapping_name, keybind, threshold_percentage,
                keypress_trigger_threshold_percentage, trigger_count
             FROM session_mapping_stats WHERE session_id = ?1 ORDER BY mapping_name ASC",
        )
        .unwrap();

    statement
        .query_map(params![session_id], |row| {
            Ok(StoredStat {
                mapping_name: row.get(0)?,
                keybind: row.get(1)?,
                threshold_percentage: row.get(2)?,
                keypress_trigger_threshold_percentage: row.get(3)?,
                trigger_count: row.get(4)?,
            })
        })
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap()
}

pub(super) fn mock_app_with(conn: Connection) -> App<MockRuntime> {
    let app = tauri::test::mock_app();
    assert!(app.manage(DbState {
        conn: Mutex::new(conn)
    }));
    app
}
