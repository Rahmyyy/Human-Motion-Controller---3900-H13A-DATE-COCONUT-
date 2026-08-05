use super::*;
use crate::test_support::setup_test_conn;
use rusqlite::params;

const TEST_PATIENT_ID: &str = "patient-1";
const TEST_PRESET_ID: &str = "preset-1";
const STARTED_AT_MS: i64 = 1_754_000_000_000;

struct StoredSession {
    preset_id: String,
    preset_name: String,
    started_at_ms: i64,
    ended_at_ms: i64,
    duration_ms: i64,
    trigger_count: i64,
}

struct StoredStat {
    mapping_name: String,
    keybind: String,
    threshold_percentage: u32,
    keypress_trigger_threshold_percentage: u32,
    trigger_count: i64,
}

fn completed_session<'a>(
    session_id: &'a str,
    ended_at_ms: i64,
    trigger_counts: &'a HashMap<String, u32>,
) -> CompletedSession<'a> {
    CompletedSession {
        session_id,
        patient_id: TEST_PATIENT_ID,
        preset_id: TEST_PRESET_ID,
        started_at_ms: STARTED_AT_MS,
        ended_at_ms,
        trigger_counts_by_mapping: trigger_counts,
    }
}

fn insert_mapping(conn: &Connection, id: &str, name: &str, keypress_trigger_threshold: u32) {
    conn.execute(
        "
        INSERT INTO movement_mappings (
            id, preset_id, name, keybind, keypress_type, pose_frames_json,
            selected_landmarks_json, threshold_percentage,
            keypress_trigger_threshold_percentage, created_at
        ) VALUES (?1, ?2, ?3, ?4, 'Click', '[]', '[]', 100, ?5, ?6)
        ",
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

fn read_session(conn: &Connection, session_id: &str) -> StoredSession {
    conn.query_row(
        "
        SELECT preset_id, preset_name, started_at_ms, ended_at_ms, duration_ms, trigger_count
        FROM sessions WHERE id = ?1
        ",
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

fn read_stats(conn: &Connection, session_id: &str) -> Vec<StoredStat> {
    let mut statement = conn
        .prepare(
            "
            SELECT mapping_name, keybind, threshold_percentage,
                keypress_trigger_threshold_percentage, trigger_count
            FROM session_mapping_stats WHERE session_id = ?1 ORDER BY mapping_name ASC
            ",
        )
        .unwrap();

    let stats = statement
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
        .unwrap();

    stats
}

#[test]
fn record_completed_session_stores_duration_and_preset_name() {
    let mut conn = setup_test_conn();
    let counts = HashMap::new();

    record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS + 756_000, &counts),
    )
    .unwrap();

    let stored = read_session(&conn, "session-1");
    assert_eq!(stored.preset_id, TEST_PRESET_ID);
    assert_eq!(stored.preset_name, "Test Preset");
    assert_eq!(stored.started_at_ms, STARTED_AT_MS);
    assert_eq!(stored.ended_at_ms, STARTED_AT_MS + 756_000);
    assert_eq!(stored.duration_ms, 756_000);
    assert_eq!(stored.trigger_count, 0);
}

#[test]
fn record_completed_session_totals_triggers_across_mappings() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    insert_mapping(&conn, "mapping-2", "Steer left", 55);
    let counts = HashMap::from([("mapping-1".to_string(), 18), ("mapping-2".to_string(), 13)]);

    record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS + 1_000, &counts),
    )
    .unwrap();

    assert_eq!(read_session(&conn, "session-1").trigger_count, 31);
}

#[test]
fn record_completed_session_counts_triggers_from_mappings_deleted_mid_session() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    let counts = HashMap::from([
        ("mapping-1".to_string(), 4),
        ("mapping-gone".to_string(), 3),
    ]);

    record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS + 1_000, &counts),
    )
    .unwrap();

    assert_eq!(read_session(&conn, "session-1").trigger_count, 7);
    assert_eq!(read_stats(&conn, "session-1").len(), 1);
}

#[test]
fn record_completed_session_snapshots_every_mapping_including_untriggered_ones() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    insert_mapping(&conn, "mapping-2", "Steer left", 55);
    let counts = HashMap::from([("mapping-1".to_string(), 9)]);

    record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS + 1_000, &counts),
    )
    .unwrap();

    let stats = read_stats(&conn, "session-1");
    assert_eq!(stats.len(), 2);
    assert_eq!(stats[0].mapping_name, "Accelerate");
    assert_eq!(stats[0].keybind, "A");
    assert_eq!(stats[0].threshold_percentage, 100);
    assert_eq!(stats[0].keypress_trigger_threshold_percentage, 65);
    assert_eq!(stats[0].trigger_count, 9);
    assert_eq!(stats[1].mapping_name, "Steer left");
    assert_eq!(stats[1].trigger_count, 0);
}

#[test]
fn recorded_thresholds_survive_a_later_threshold_change() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    let counts = HashMap::new();

    record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS + 1_000, &counts),
    )
    .unwrap();
    conn.execute(
        "UPDATE movement_mappings SET keypress_trigger_threshold_percentage = 80 WHERE id = ?1",
        params!["mapping-1"],
    )
    .unwrap();

    let stats = read_stats(&conn, "session-1");
    assert_eq!(stats[0].keypress_trigger_threshold_percentage, 65);
}

#[test]
fn record_completed_session_rejects_a_duplicate_session_id() {
    let mut conn = setup_test_conn();
    let counts = HashMap::new();

    record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS + 1_000, &counts),
    )
    .unwrap();
    let result = record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS + 2_000, &counts),
    );

    assert_eq!(
        result.err().unwrap().to_string(),
        "Session has already been recorded"
    );
    assert_eq!(read_session(&conn, "session-1").duration_ms, 1_000);
}

#[test]
fn record_completed_session_rejects_an_end_before_its_start() {
    let mut conn = setup_test_conn();
    let counts = HashMap::new();

    let result = record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS - 1, &counts),
    );

    assert_eq!(
        result.err().unwrap().to_string(),
        "Session cannot end before it starts"
    );
}

#[test]
fn record_completed_session_rejects_a_preset_from_another_patient() {
    let mut conn = setup_test_conn();
    conn.execute(
        "INSERT INTO patients (id, display_name, clinical_notes, created_at)
         VALUES ('patient-2', 'Other Patient', NULL, '0')",
        [],
    )
    .unwrap();
    let counts = HashMap::new();

    let result = record_completed_session(
        &mut conn,
        &CompletedSession {
            patient_id: "patient-2",
            ..completed_session("session-1", STARTED_AT_MS + 1_000, &counts)
        },
    );

    assert_eq!(
        result.err().unwrap().to_string(),
        "Preset not found for this patient"
    );
}

#[test]
fn record_completed_session_rejects_empty_identifiers() {
    let mut conn = setup_test_conn();
    let counts = HashMap::new();

    let result = record_completed_session(
        &mut conn,
        &completed_session("   ", STARTED_AT_MS + 1_000, &counts),
    );

    assert_eq!(
        result.err().unwrap().to_string(),
        "Session ID cannot be empty"
    );
}

#[test]
fn deleting_a_patient_removes_their_recorded_sessions() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    let counts = HashMap::from([("mapping-1".to_string(), 2)]);

    record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS + 1_000, &counts),
    )
    .unwrap();
    conn.execute(
        "DELETE FROM patients WHERE id = ?1",
        params![TEST_PATIENT_ID],
    )
    .unwrap();

    assert!(!repository::session_exists(&conn, "session-1").unwrap());
    assert!(read_stats(&conn, "session-1").is_empty());
}

#[test]
fn recorded_sessions_survive_deleting_the_preset_they_used() {
    let mut conn = setup_test_conn();
    let counts = HashMap::new();

    record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS + 1_000, &counts),
    )
    .unwrap();
    conn.execute("DELETE FROM presets WHERE id = ?1", params![TEST_PRESET_ID])
        .unwrap();

    let stored = read_session(&conn, "session-1");
    assert_eq!(stored.preset_id, TEST_PRESET_ID);
    assert_eq!(stored.preset_name, "Test Preset");
}
