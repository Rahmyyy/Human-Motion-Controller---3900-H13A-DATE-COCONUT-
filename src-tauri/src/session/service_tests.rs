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

/// Moves a mapping's range-of-motion threshold, the value the history page charts.
fn set_movement_threshold(conn: &Connection, mapping_id: &str, percentage: u32) {
    conn.execute(
        "UPDATE movement_mappings SET threshold_percentage = ?1 WHERE id = ?2",
        params![percentage, mapping_id],
    )
    .unwrap();
}

/// Records a session that ran for one second starting at `started_at_ms`.
fn record_session_at(
    conn: &mut Connection,
    session_id: &str,
    started_at_ms: i64,
    trigger_counts: &HashMap<String, u32>,
) {
    record_completed_session(
        conn,
        &CompletedSession {
            started_at_ms,
            ended_at_ms: started_at_ms + 1_000,
            ..completed_session(session_id, started_at_ms + 1_000, trigger_counts)
        },
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

const DAY_MS: i64 = 86_400_000;

#[test]
fn list_patient_sessions_returns_newest_first() {
    let mut conn = setup_test_conn();
    let counts = HashMap::new();

    record_session_at(&mut conn, "session-old", STARTED_AT_MS, &counts);
    record_session_at(
        &mut conn,
        "session-new",
        STARTED_AT_MS + 2 * DAY_MS,
        &counts,
    );
    record_session_at(&mut conn, "session-mid", STARTED_AT_MS + DAY_MS, &counts);

    let sessions = list_patient_sessions(&conn, TEST_PATIENT_ID).unwrap();

    let ids: Vec<&str> = sessions.iter().map(|session| session.id.as_str()).collect();
    assert_eq!(ids, ["session-new", "session-mid", "session-old"]);
}

#[test]
fn list_patient_sessions_returns_the_duration_and_triggers_it_recorded() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    let counts = HashMap::from([("mapping-1".to_string(), 12)]);

    record_completed_session(
        &mut conn,
        &completed_session("session-1", STARTED_AT_MS + 756_000, &counts),
    )
    .unwrap();

    let sessions = list_patient_sessions(&conn, TEST_PATIENT_ID).unwrap();
    assert_eq!(sessions.len(), 1);
    assert_eq!(sessions[0].started_at_ms, STARTED_AT_MS);
    assert_eq!(sessions[0].duration_ms, 756_000);
    assert_eq!(sessions[0].trigger_count, 12);
    assert_eq!(sessions[0].preset_name, "Test Preset");
}

#[test]
fn list_patient_sessions_includes_every_mapping_snapshot() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    insert_mapping(&conn, "mapping-2", "Steer left", 55);
    let counts = HashMap::from([("mapping-1".to_string(), 9)]);

    record_session_at(&mut conn, "session-1", STARTED_AT_MS, &counts);

    let sessions = list_patient_sessions(&conn, TEST_PATIENT_ID).unwrap();
    let mappings = &sessions[0].mappings;
    assert_eq!(mappings.len(), 2);
    assert_eq!(mappings[0].mapping_name, "Accelerate");
    assert_eq!(mappings[0].trigger_count, 9);
    assert_eq!(mappings[1].mapping_name, "Steer left");
    assert_eq!(mappings[1].trigger_count, 0);
}

#[test]
fn list_patient_sessions_groups_stats_with_their_own_session() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    let counts = HashMap::new();

    set_movement_threshold(&conn, "mapping-1", 50);
    record_session_at(&mut conn, "session-1", STARTED_AT_MS, &counts);
    set_movement_threshold(&conn, "mapping-1", 70);
    record_session_at(&mut conn, "session-2", STARTED_AT_MS + DAY_MS, &counts);

    let sessions = list_patient_sessions(&conn, TEST_PATIENT_ID).unwrap();
    assert_eq!(sessions[0].id, "session-2");
    assert_eq!(sessions[0].mappings[0].threshold_percentage, 70);
    assert_eq!(sessions[1].id, "session-1");
    assert_eq!(sessions[1].mappings[0].threshold_percentage, 50);
}

#[test]
fn list_patient_sessions_returns_the_threshold_the_session_ran_with() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    let counts = HashMap::new();

    set_movement_threshold(&conn, "mapping-1", 60);
    record_session_at(&mut conn, "session-1", STARTED_AT_MS, &counts);
    set_movement_threshold(&conn, "mapping-1", 85);

    let sessions = list_patient_sessions(&conn, TEST_PATIENT_ID).unwrap();
    assert_eq!(sessions[0].mappings[0].threshold_percentage, 60);
}

#[test]
fn list_patient_sessions_returns_nothing_for_a_patient_without_sessions() {
    let conn = setup_test_conn();

    assert!(list_patient_sessions(&conn, TEST_PATIENT_ID)
        .unwrap()
        .is_empty());
}

#[test]
fn list_patient_sessions_excludes_another_patients_sessions() {
    let mut conn = setup_test_conn();
    let counts = HashMap::new();
    record_session_at(&mut conn, "session-1", STARTED_AT_MS, &counts);
    conn.execute(
        "INSERT INTO patients (id, display_name, clinical_notes, created_at)
         VALUES ('patient-2', 'Other Patient', NULL, '0')",
        [],
    )
    .unwrap();

    assert_eq!(
        list_patient_sessions(&conn, TEST_PATIENT_ID).unwrap().len(),
        1
    );
    assert!(list_patient_sessions(&conn, "patient-2")
        .unwrap()
        .is_empty());
}

#[test]
fn list_patient_sessions_keeps_sessions_from_a_deleted_preset() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    let counts = HashMap::from([("mapping-1".to_string(), 3)]);

    record_session_at(&mut conn, "session-1", STARTED_AT_MS, &counts);
    conn.execute("DELETE FROM presets WHERE id = ?1", params![TEST_PRESET_ID])
        .unwrap();

    let sessions = list_patient_sessions(&conn, TEST_PATIENT_ID).unwrap();
    assert_eq!(sessions.len(), 1);
    assert_eq!(sessions[0].preset_id, TEST_PRESET_ID);
    assert_eq!(sessions[0].preset_name, "Test Preset");
    assert_eq!(sessions[0].mappings[0].mapping_name, "Accelerate");
}

#[test]
fn list_patient_sessions_rejects_an_empty_patient_id() {
    let conn = setup_test_conn();

    assert_eq!(
        list_patient_sessions(&conn, "   ")
            .err()
            .unwrap()
            .to_string(),
        "Patient ID cannot be empty"
    );
}

#[test]
fn list_patient_sessions_rejects_an_unknown_patient() {
    let conn = setup_test_conn();

    assert_eq!(
        list_patient_sessions(&conn, "patient-missing")
            .err()
            .unwrap()
            .to_string(),
        "Patient not found"
    );
}
