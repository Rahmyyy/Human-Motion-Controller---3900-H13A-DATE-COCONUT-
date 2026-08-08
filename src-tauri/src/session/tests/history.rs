use rusqlite::params;

use super::*;

#[test]
fn history_is_newest_first_and_contains_recorded_values() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    let counts = HashMap::from([("mapping-1".to_string(), 12)]);

    record_session_at(&mut conn, "session-old", STARTED_AT_MS, &counts);
    record_session_at(&mut conn, "session-new", STARTED_AT_MS + DAY_MS, &counts);

    let sessions = service::list_patient_sessions(&conn, TEST_PATIENT_ID).unwrap();
    assert_eq!(
        sessions
            .iter()
            .map(|session| session.id.as_str())
            .collect::<Vec<_>>(),
        ["session-new", "session-old"]
    );
    assert_eq!(sessions[0].preset_id, TEST_PRESET_ID);
    assert_eq!(sessions[0].preset_name, "Test Preset");
    assert_eq!(sessions[0].duration_ms, 1_000);
    assert_eq!(sessions[0].trigger_count, 12);
}

#[test]
fn history_groups_each_sessions_mapping_snapshots() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    insert_mapping(&conn, "mapping-2", "Steer left", 55);
    let counts = HashMap::from([("mapping-1".to_string(), 9)]);

    set_movement_threshold(&conn, "mapping-1", 50);
    record_session_at(&mut conn, "session-1", STARTED_AT_MS, &counts);
    set_movement_threshold(&conn, "mapping-1", 70);
    record_session_at(&mut conn, "session-2", STARTED_AT_MS + DAY_MS, &counts);

    let sessions = service::list_patient_sessions(&conn, TEST_PATIENT_ID).unwrap();
    assert_eq!(sessions[0].mappings.len(), 2);
    assert_eq!(sessions[0].mappings[0].mapping_name, "Accelerate");
    assert_eq!(sessions[0].mappings[0].trigger_count, 9);
    assert_eq!(sessions[0].mappings[0].threshold_percentage, 70);
    assert_eq!(sessions[0].mappings[1].mapping_name, "Steer left");
    assert_eq!(sessions[0].mappings[1].trigger_count, 0);
    assert_eq!(sessions[1].mappings[0].threshold_percentage, 50);
}

#[test]
fn history_returns_empty_for_a_known_patient_without_sessions() {
    let conn = setup_test_conn();
    assert!(service::list_patient_sessions(&conn, TEST_PATIENT_ID)
        .unwrap()
        .is_empty());
}

#[test]
fn history_excludes_other_patients_sessions() {
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
        service::list_patient_sessions(&conn, TEST_PATIENT_ID)
            .unwrap()
            .len(),
        1
    );
    assert!(service::list_patient_sessions(&conn, "patient-2")
        .unwrap()
        .is_empty());
}

#[test]
fn history_survives_deleting_the_live_preset() {
    let mut conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", "Accelerate", 65);
    let counts = HashMap::from([("mapping-1".to_string(), 3)]);
    record_session_at(&mut conn, "session-1", STARTED_AT_MS, &counts);
    conn.execute("DELETE FROM presets WHERE id = ?1", params![TEST_PRESET_ID])
        .unwrap();

    let sessions = service::list_patient_sessions(&conn, TEST_PATIENT_ID).unwrap();
    assert_eq!(sessions[0].preset_id, TEST_PRESET_ID);
    assert_eq!(sessions[0].preset_name, "Test Preset");
    assert_eq!(sessions[0].mappings[0].mapping_name, "Accelerate");
}
