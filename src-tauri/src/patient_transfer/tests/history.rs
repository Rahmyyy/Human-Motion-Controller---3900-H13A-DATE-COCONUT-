use std::fs;

use rusqlite::params;

use super::{count, seed_source_patient, temp_json_path};
use crate::patient_transfer::service::{export_patient, import_patient};
use crate::test_support::setup_test_conn;

/// Exports the seeded patient, imports it back and returns the connection alongside the new id.
fn round_trip() -> (rusqlite::Connection, String) {
    let mut conn = setup_test_conn();
    seed_source_patient(&conn);

    let export_path = temp_json_path("history");
    export_patient(&conn, "patient-1", &export_path).unwrap();
    let imported = import_patient(&mut conn, &export_path).unwrap();
    fs::remove_file(&export_path).ok();

    (conn, imported.id)
}

#[test]
fn scheduled_sessions_survive_the_round_trip() {
    let (conn, patient_id) = round_trip();

    let (scheduled_at_ms, created_at_ms): (i64, i64) = conn
        .query_row(
            "SELECT scheduled_at_ms, created_at_ms
             FROM scheduled_sessions
             WHERE patient_id = ?1",
            params![patient_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap();

    assert_eq!(scheduled_at_ms, 3000);
    assert_eq!(created_at_ms, 2000);
    assert_eq!(count(&conn, "scheduled_sessions"), 2);
}

#[test]
fn completed_sessions_survive_the_round_trip() {
    let (conn, patient_id) = round_trip();

    let (preset_id, preset_name, started_at_ms, duration_ms, trigger_count): (
        String,
        String,
        i64,
        i64,
        i64,
    ) = conn
        .query_row(
            "SELECT preset_id, preset_name, started_at_ms, duration_ms, trigger_count
             FROM sessions
             WHERE patient_id = ?1",
            params![patient_id],
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

    // History is rewired to the regenerated preset, not left pointing at the source's id.
    let imported_preset_id: String = conn
        .query_row(
            "SELECT id FROM presets WHERE patient_id = ?1",
            params![patient_id],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(preset_id, imported_preset_id);
    assert_eq!(preset_name, "Test Preset");
    assert_eq!(started_at_ms, 10_000);
    assert_eq!(duration_ms, 6_000);
    assert_eq!(trigger_count, 3);
    assert_eq!(count(&conn, "sessions"), 2);
}

#[test]
fn session_mapping_stats_are_rewired_to_the_imported_mapping() {
    let (conn, patient_id) = round_trip();

    let (mapping_id, mapping_name, threshold, triggers): (String, String, u32, i64) = conn
        .query_row(
            "SELECT stats.mapping_id, stats.mapping_name, stats.threshold_percentage,
                    stats.trigger_count
             FROM session_mapping_stats AS stats
             JOIN sessions ON sessions.id = stats.session_id
             WHERE sessions.patient_id = ?1",
            params![patient_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .unwrap();

    let imported_mapping_id: String = conn
        .query_row(
            "SELECT mappings.id
             FROM movement_mappings AS mappings
             JOIN presets ON presets.id = mappings.preset_id
             WHERE presets.patient_id = ?1",
            params![patient_id],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(mapping_id, imported_mapping_id);
    assert_eq!(mapping_name, "Arm Raise");
    assert_eq!(threshold, 90);
    assert_eq!(triggers, 3);
    assert_eq!(count(&conn, "session_mapping_stats"), 2);
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

    // With no preset left to rewire to, the snapshot keeps the source's own identifiers.
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
