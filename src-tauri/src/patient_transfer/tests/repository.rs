use rusqlite::Connection;

use super::{count, seed_source_patient};
use crate::patient_transfer::repository::{
    insert_patient_tree, select_mappings_for_preset, select_patient_row,
    select_presets_for_patient, select_scheduled_sessions_for_patient, NewCompletedSession,
    NewMapping, NewPatientTree, NewPreset, NewScheduledSession, NewSessionMapping,
};
use crate::test_support::setup_test_conn;

fn mapping(id: &str) -> NewMapping {
    NewMapping {
        id: id.to_string(),
        name: "Arm Raise".to_string(),
        created_at: "1".to_string(),
        keybind: "W".to_string(),
        keypress_type: "Click".to_string(),
        pose_frames_json: r#"[{"t":0}]"#.to_string(),
        selected_landmarks_json: "[11,12]".to_string(),
        threshold_percentage: 90,
        keypress_trigger_threshold_percentage: 70,
    }
}

fn preset(id: &str, mappings: Vec<NewMapping>) -> NewPreset {
    NewPreset {
        id: id.to_string(),
        name: "Preset".to_string(),
        created_at: "0".to_string(),
        default_pose_frames_json: Some(r#"[{"t":0},{"t":1}]"#.to_string()),
        mappings,
    }
}

fn session(id: &str, mappings: Vec<NewSessionMapping>) -> NewCompletedSession {
    NewCompletedSession {
        id: id.to_string(),
        preset_id: "preset-a".to_string(),
        preset_name: "Preset".to_string(),
        started_at_ms: 10_000,
        ended_at_ms: 16_000,
        duration_ms: 6_000,
        trigger_count: 3,
        mappings,
    }
}

fn session_mapping(mapping_id: &str) -> NewSessionMapping {
    NewSessionMapping {
        mapping_id: mapping_id.to_string(),
        mapping_name: "Arm Raise".to_string(),
        keybind: "W".to_string(),
        threshold_percentage: 90,
        keypress_trigger_threshold_percentage: 70,
        trigger_count: 3,
    }
}

fn tree(presets: Vec<NewPreset>) -> NewPatientTree {
    NewPatientTree {
        patient_id: "imported-1".to_string(),
        display_name: "Imported".to_string(),
        clinical_notes: None,
        created_at: "0".to_string(),
        status: "active".to_string(),
        last_activity_at_ms: 0,
        presets,
        scheduled_sessions: vec![],
        completed_sessions: vec![],
    }
}

#[test]
fn the_selects_return_the_seeded_tree() {
    let conn = setup_test_conn();
    seed_source_patient(&conn);

    let patient = select_patient_row(&conn, "patient-1").unwrap();
    assert_eq!(patient.display_name, "Test Patient");
    assert_eq!(
        patient.clinical_notes.as_deref(),
        Some("Mobility programme")
    );
    assert_eq!(patient.status, "needsReview");
    assert_eq!(patient.last_activity_at_ms, 4242);

    let presets = select_presets_for_patient(&conn, "patient-1").unwrap();
    assert_eq!(presets.len(), 1);
    assert_eq!(presets[0].id, "preset-1");

    let mappings = select_mappings_for_preset(&conn, "preset-1").unwrap();
    assert_eq!(mappings.len(), 1);
    assert_eq!(mappings[0].keybind, "W");
    assert_eq!(mappings[0].threshold_percentage, 90);

    let sessions = select_scheduled_sessions_for_patient(&conn, "patient-1").unwrap();
    assert_eq!(sessions.len(), 1);
    assert_eq!(sessions[0].scheduled_at_ms, 3000);
}

#[test]
fn the_selects_ignore_another_patients_rows() {
    let conn = setup_test_conn();
    seed_source_patient(&conn);

    assert!(select_patient_row(&conn, "missing").is_err());
    assert!(select_presets_for_patient(&conn, "missing")
        .unwrap()
        .is_empty());
    assert!(select_mappings_for_preset(&conn, "missing")
        .unwrap()
        .is_empty());
    assert!(select_scheduled_sessions_for_patient(&conn, "missing")
        .unwrap()
        .is_empty());
}

#[test]
fn every_statement_propagates_a_missing_schema() {
    let mut conn = Connection::open_in_memory().unwrap();

    assert!(select_patient_row(&conn, "patient-1").is_err());
    assert!(select_presets_for_patient(&conn, "patient-1").is_err());
    assert!(select_mappings_for_preset(&conn, "preset-1").is_err());
    assert!(select_scheduled_sessions_for_patient(&conn, "patient-1").is_err());
    assert!(insert_patient_tree(&mut conn, &tree(vec![])).is_err());
}

#[test]
fn a_transaction_cannot_be_opened_inside_another_one() {
    let mut conn = setup_test_conn();
    conn.execute_batch("BEGIN").unwrap();

    assert!(insert_patient_tree(&mut conn, &tree(vec![])).is_err());
}

/// Each level of the tree is inserted after the one above it, so a duplicate at any level has to
/// roll the whole thing back rather than leave a half-written patient behind.
#[test]
fn a_duplicate_anywhere_in_the_tree_rolls_the_whole_insert_back() {
    let duplicate_preset = tree(vec![preset("preset-a", vec![]), preset("preset-a", vec![])]);

    let duplicate_mapping = tree(vec![preset(
        "preset-a",
        vec![mapping("mapping-a"), mapping("mapping-a")],
    )]);

    let mut duplicate_scheduled = tree(vec![]);
    duplicate_scheduled.scheduled_sessions = vec![
        NewScheduledSession {
            id: "scheduled-a".to_string(),
            scheduled_at_ms: 3000,
            created_at_ms: 2000,
        },
        NewScheduledSession {
            id: "scheduled-a".to_string(),
            scheduled_at_ms: 4000,
            created_at_ms: 2000,
        },
    ];

    let mut duplicate_session = tree(vec![]);
    duplicate_session.completed_sessions =
        vec![session("session-a", vec![]), session("session-a", vec![])];

    let mut duplicate_session_mapping = tree(vec![]);
    duplicate_session_mapping.completed_sessions = vec![session(
        "session-a",
        vec![session_mapping("mapping-a"), session_mapping("mapping-a")],
    )];

    for (label, bad_tree) in [
        ("preset", duplicate_preset),
        ("mapping", duplicate_mapping),
        ("scheduled session", duplicate_scheduled),
        ("completed session", duplicate_session),
        ("session mapping", duplicate_session_mapping),
    ] {
        let mut conn = setup_test_conn();

        assert!(
            insert_patient_tree(&mut conn, &bad_tree).is_err(),
            "a duplicate {label} should be rejected"
        );
        assert_eq!(count(&conn, "patients"), 1, "{label} left a patient behind");
        assert_eq!(count(&conn, "presets"), 1, "{label} left a preset behind");
        assert_eq!(count(&conn, "sessions"), 0, "{label} left a session behind");
    }
}
