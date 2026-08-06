use super::*;
use crate::test_support::setup_test_conn;
use rusqlite::params;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

/// `setup_test_conn` seeds `patient-1` / `preset-1` with an empty default pose, which isn't a
/// valid (>= 2 frame) pose on its own — top it up and attach one mapping so the source patient
/// has a realistic, importable tree.
fn seed_source_patient(conn: &rusqlite::Connection) {
    conn.execute(
        "UPDATE patients
         SET clinical_notes = 'Mobility programme',
             status = 'needsReview',
             last_activity_at_ms = 4242
         WHERE id = 'patient-1'",
        [],
    )
    .unwrap();

    conn.execute(
        "UPDATE presets SET default_pose_frames_json = ?1 WHERE id = 'preset-1'",
        params![r#"[{"t":0},{"t":33}]"#],
    )
    .unwrap();

    conn.execute(
        "INSERT INTO scheduled_sessions (
            id, patient_id, scheduled_at_ms, created_at_ms
         ) VALUES (?1, ?2, ?3, ?4)",
        params!["session-1", "patient-1", 3000, 2000],
    )
    .unwrap();

    conn.execute(
        "INSERT INTO movement_mappings (
            id, preset_id, name, keybind, keypress_type, pose_frames_json,
            selected_landmarks_json, threshold_percentage,
            keypress_trigger_threshold_percentage, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            "mapping-1",
            "preset-1",
            "Arm Raise",
            "W",
            "Click",
            r#"[{"t":0},{"t":33}]"#,
            "[11,12]",
            90,
            70,
            "1"
        ],
    )
    .unwrap();

    conn.execute(
        "INSERT INTO sessions (
            id, patient_id, preset_id, preset_name, started_at_ms, ended_at_ms,
            duration_ms, trigger_count
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            "completed-session-1",
            "patient-1",
            "preset-1",
            "Test Preset",
            10_000,
            16_000,
            6_000,
            3
        ],
    )
    .unwrap();

    conn.execute(
        "INSERT INTO session_mapping_stats (
            session_id, mapping_id, mapping_name, keybind, threshold_percentage,
            keypress_trigger_threshold_percentage, trigger_count
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            "completed-session-1",
            "mapping-1",
            "Arm Raise",
            "W",
            90,
            70,
            3
        ],
    )
    .unwrap();
}

fn temp_json_path(name: &str) -> String {
    std::env::temp_dir()
        .join(format!(
            "human-controller-test-{name}-{}-{}.json",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ))
        .to_str()
        .unwrap()
        .to_string()
}

fn write_temp_json(name: &str, contents: &str) -> String {
    let path = temp_json_path(name);
    fs::write(&path, contents).unwrap();
    path
}

fn count(conn: &rusqlite::Connection, table: &str) -> i64 {
    conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| {
        row.get(0)
    })
    .unwrap()
}

#[test]
fn export_then_import_round_trips_the_full_patient_tree() {
    let mut conn = setup_test_conn();
    seed_source_patient(&conn);

    let export_path = temp_json_path("round-trip");
    export_patient(&conn, "patient-1", &export_path).unwrap();

    let exported_json: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(&export_path).unwrap()).unwrap();
    assert_eq!(exported_json["exportFormatVersion"], 1);
    assert_eq!(
        exported_json["patient"]["completedSessions"]
            .as_array()
            .unwrap()
            .len(),
        1
    );

    let imported = import_patient(&mut conn, &export_path).unwrap();
    fs::remove_file(&export_path).ok();

    assert_ne!(imported.id, "patient-1");
    assert_eq!(imported.display_name, "Test Patient");
    assert_eq!(
        imported.clinical_notes.as_deref(),
        Some("Mobility programme")
    );
    assert_eq!(imported.created_at, "0");
    assert_eq!(imported.preset_count, 1);
    assert_eq!(imported.status, "needsReview");
    assert_eq!(imported.last_activity_at_ms, 4242);

    assert_eq!(count(&conn, "patients"), 2);
    assert_eq!(
        conn.query_row(
            "SELECT COUNT(*) FROM presets WHERE patient_id = ?1",
            params![imported.id],
            |row| row.get::<_, i64>(0),
        )
        .unwrap(),
        1
    );

    let (
        mapping_name,
        mapping_created_at,
        keybind,
        keypress_type,
        pose_frames,
        landmarks,
        threshold,
        trigger_threshold,
    ): (String, String, String, String, String, String, u32, u32) = conn
        .query_row(
            "SELECT mm.name, mm.created_at, mm.keybind, mm.keypress_type,
                    mm.pose_frames_json, mm.selected_landmarks_json,
                    mm.threshold_percentage, mm.keypress_trigger_threshold_percentage
             FROM movement_mappings mm
             JOIN presets p ON p.id = mm.preset_id
             WHERE p.patient_id = ?1",
            params![imported.id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                ))
            },
        )
        .unwrap();

    assert_eq!(mapping_name, "Arm Raise");
    assert_eq!(mapping_created_at, "1");
    assert_eq!(keybind, "W");
    assert_eq!(keypress_type, "Click");
    assert_eq!(pose_frames, r#"[{"t":0},{"t":33}]"#);
    assert_eq!(landmarks, "[11,12]");
    assert_eq!(threshold, 90);
    assert_eq!(trigger_threshold, 70);

    let (preset_name, preset_created_at, default_pose): (String, String, String) = conn
        .query_row(
            "SELECT p.name, p.created_at, p.default_pose_frames_json
             FROM presets p
             WHERE p.patient_id = ?1",
            params![imported.id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap();
    assert_eq!(preset_name, "Test Preset");
    assert_eq!(preset_created_at, "0");
    assert_eq!(default_pose, r#"[{"t":0},{"t":33}]"#);

    let (scheduled_at_ms, session_created_at_ms): (i64, i64) = conn
        .query_row(
            "SELECT scheduled_at_ms, created_at_ms
             FROM scheduled_sessions
             WHERE patient_id = ?1",
            params![imported.id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap();
    assert_eq!(scheduled_at_ms, 3000);
    assert_eq!(session_created_at_ms, 2000);
    assert_eq!(count(&conn, "scheduled_sessions"), 2);

    let (history_preset_id, history_preset_name, started_at_ms, duration_ms, trigger_count): (
        String,
        String,
        i64,
        i64,
        i64,
    ) = conn
        .query_row(
            "SELECT sessions.preset_id, sessions.preset_name, sessions.started_at_ms,
                    sessions.duration_ms, sessions.trigger_count
             FROM sessions
             WHERE sessions.patient_id = ?1",
            params![imported.id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                ))
            },
        )
        .unwrap();
    let imported_preset_id: String = conn
        .query_row(
            "SELECT id FROM presets WHERE patient_id = ?1",
            params![imported.id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(history_preset_id, imported_preset_id);
    assert_eq!(history_preset_name, "Test Preset");
    assert_eq!(started_at_ms, 10_000);
    assert_eq!(duration_ms, 6_000);
    assert_eq!(trigger_count, 3);

    let (history_mapping_id, history_mapping_name, history_threshold, history_triggers): (
        String,
        String,
        u32,
        i64,
    ) = conn
        .query_row(
            "SELECT stats.mapping_id, stats.mapping_name, stats.threshold_percentage,
                    stats.trigger_count
             FROM session_mapping_stats AS stats
             JOIN sessions ON sessions.id = stats.session_id
             WHERE sessions.patient_id = ?1",
            params![imported.id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .unwrap();
    let imported_mapping_id: String = conn
        .query_row(
            "SELECT mappings.id
             FROM movement_mappings AS mappings
             JOIN presets ON presets.id = mappings.preset_id
             WHERE presets.patient_id = ?1",
            params![imported.id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(history_mapping_id, imported_mapping_id);
    assert_eq!(history_mapping_name, "Arm Raise");
    assert_eq!(history_threshold, 90);
    assert_eq!(history_triggers, 3);
    assert_eq!(count(&conn, "sessions"), 2);
    assert_eq!(count(&conn, "session_mapping_stats"), 2);

    // The original patient must be untouched by the import.
    assert_eq!(count(&conn, "patients"), 2);
    assert_eq!(
        conn.query_row(
            "SELECT COUNT(*) FROM presets WHERE patient_id = 'patient-1'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .unwrap(),
        1
    );
}

#[test]
fn round_trip_preserves_history_after_its_live_preset_was_deleted() {
    let mut conn = setup_test_conn();
    seed_source_patient(&conn);
    conn.execute("DELETE FROM presets WHERE id = 'preset-1'", [])
        .unwrap();

    let export_path = temp_json_path("deleted-preset-history");
    export_patient(&conn, "patient-1", &export_path).unwrap();
    let imported = import_patient(&mut conn, &export_path).unwrap();
    fs::remove_file(&export_path).ok();

    assert_eq!(imported.preset_count, 0);
    let history: (String, String, String, String) = conn
        .query_row(
            "SELECT sessions.preset_id, sessions.preset_name,
                    stats.mapping_id, stats.mapping_name
             FROM sessions
             JOIN session_mapping_stats AS stats ON stats.session_id = sessions.id
             WHERE sessions.patient_id = ?1",
            params![imported.id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .unwrap();

    assert_eq!(
        history,
        (
            "preset-1".into(),
            "Test Preset".into(),
            "mapping-1".into(),
            "Arm Raise".into(),
        )
    );
}

#[test]
fn legacy_export_without_integration_fields_uses_safe_defaults() {
    let mut conn = setup_test_conn();
    let path = write_temp_json(
        "legacy-v1",
        r#"{
            "exportFormatVersion": 1,
            "exportedAt": "0",
            "patient": {
                "displayName": "Legacy Patient",
                "presets": []
            }
        }"#,
    );

    let imported = import_patient(&mut conn, &path).unwrap();
    fs::remove_file(&path).ok();

    assert_eq!(imported.status, "active");
    assert_eq!(imported.last_activity_at_ms, 0);
    assert_eq!(imported.preset_count, 0);
    assert_eq!(
        conn.query_row(
            "SELECT COUNT(*) FROM scheduled_sessions WHERE patient_id = ?1",
            params![imported.id],
            |row| row.get::<_, i64>(0),
        )
        .unwrap(),
        0
    );
}

#[test]
fn import_rejects_missing_export_format_version() {
    let mut conn = setup_test_conn();
    let path = write_temp_json(
        "missing-version",
        r#"{"exportedAt": "0", "patient": {"displayName": "X", "presets": []}}"#,
    );

    let result = import_patient(&mut conn, &path);
    fs::remove_file(&path).ok();

    let message = result.unwrap_err().to_string();
    assert!(message.contains("exportFormatVersion"), "{message}");
    assert_eq!(count(&conn, "patients"), 1);
}

#[test]
fn import_rejects_unsupported_export_format_version() {
    let mut conn = setup_test_conn();
    let path = write_temp_json(
        "future-version",
        r#"{"exportFormatVersion": 99, "exportedAt": "0",
            "patient": {"displayName": "X", "presets": []}}"#,
    );

    let result = import_patient(&mut conn, &path);
    fs::remove_file(&path).ok();

    let message = result.unwrap_err().to_string();
    assert!(message.contains("version"), "{message}");
    assert_eq!(count(&conn, "patients"), 1);
}

#[test]
fn import_rejects_malformed_json_without_writing_anything() {
    let mut conn = setup_test_conn();
    let path = write_temp_json("malformed", "{ this is not valid json");

    let result = import_patient(&mut conn, &path);
    fs::remove_file(&path).ok();

    assert!(result.is_err());
    assert_eq!(count(&conn, "patients"), 1);
    assert_eq!(count(&conn, "presets"), 1);
    assert_eq!(count(&conn, "movement_mappings"), 0);
}

#[test]
fn import_rejects_out_of_range_threshold_without_partial_writes() {
    let mut conn = setup_test_conn();
    let json = r#"{
        "exportFormatVersion": 1,
        "exportedAt": "0",
        "patient": {
            "displayName": "Bad Data Patient",
            "presets": [{
                "name": "Preset",
                "defaultPoseFramesJson": "[{\"t\":0},{\"t\":1}]",
                "movementMappings": [{
                    "name": "Bad Mapping",
                    "keybind": "A",
                    "keypressType": "Click",
                    "poseFramesJson": "[{\"t\":0}]",
                    "selectedLandmarks": [11],
                    "thresholdPercentage": 100,
                    "keypressTriggerThresholdPercentage": 15
                }]
            }]
        }
    }"#;
    let path = write_temp_json("bad-threshold", json);

    let result = import_patient(&mut conn, &path);
    fs::remove_file(&path).ok();

    let message = result.unwrap_err().to_string();
    assert!(message.contains("keypress trigger threshold"), "{message}");
    assert_eq!(count(&conn, "patients"), 1);
    assert_eq!(count(&conn, "presets"), 1);
    assert_eq!(count(&conn, "movement_mappings"), 0);
}
