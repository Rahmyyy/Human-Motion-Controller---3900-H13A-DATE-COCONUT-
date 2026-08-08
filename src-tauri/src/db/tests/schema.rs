use super::{count_rows, test_conn};

#[test]
fn enables_and_enforces_foreign_keys() {
    let conn = test_conn();
    let foreign_keys_enabled: bool = conn
        .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
        .unwrap();

    let orphaned_preset = conn.execute(
        "
        INSERT INTO presets (id, patient_id, name, created_at)
        VALUES ('preset-1', 'missing-patient', 'Test preset', '0')
        ",
        [],
    );

    assert!(foreign_keys_enabled);
    assert!(orphaned_preset.is_err());
}

#[test]
fn enforces_status_and_trigger_threshold_constraints() {
    let conn = test_conn();

    let invalid_status = conn.execute(
        "
        INSERT INTO patients (id, display_name, created_at, status)
        VALUES ('invalid-patient', 'Test patient', '0', 'archived')
        ",
        [],
    );
    assert!(invalid_status.is_err());

    conn.execute_batch(
        "
        INSERT INTO patients (id, display_name, created_at)
        VALUES ('patient-1', 'Test patient', '0');

        INSERT INTO presets (id, patient_id, name, created_at)
        VALUES ('preset-1', 'patient-1', 'Test preset', '0');
        ",
    )
    .unwrap();

    let invalid_threshold = conn.execute(
        "
        INSERT INTO movement_mappings (
            id,
            preset_id,
            name,
            keybind,
            keypress_type,
            pose_frames_json,
            selected_landmarks_json,
            keypress_trigger_threshold_percentage,
            created_at
        ) VALUES (
            'mapping-1',
            'preset-1',
            'Test mapping',
            'Space',
            'press',
            '[]',
            '[]',
            101,
            '0'
        )
        ",
        [],
    );

    assert!(invalid_threshold.is_err());
}

#[test]
fn deleting_a_patient_cascades_through_owned_data() {
    let conn = test_conn();
    conn.execute_batch(
        "
        INSERT INTO patients (id, display_name, created_at)
        VALUES ('patient-1', 'Test patient', '0');

        INSERT INTO presets (id, patient_id, name, created_at)
        VALUES ('preset-1', 'patient-1', 'Test preset', '0');

        INSERT INTO movement_mappings (
            id,
            preset_id,
            name,
            keybind,
            keypress_type,
            pose_frames_json,
            selected_landmarks_json,
            created_at
        ) VALUES (
            'mapping-1',
            'preset-1',
            'Test mapping',
            'Space',
            'press',
            '[]',
            '[]',
            '0'
        );

        INSERT INTO scheduled_sessions (
            id,
            patient_id,
            scheduled_at_ms,
            created_at_ms
        ) VALUES ('scheduled-1', 'patient-1', 1000, 0);

        INSERT INTO sessions (
            id,
            patient_id,
            preset_id,
            preset_name,
            started_at_ms,
            ended_at_ms,
            duration_ms,
            trigger_count
        ) VALUES (
            'session-1',
            'patient-1',
            'preset-1',
            'Test preset',
            0,
            1000,
            1000,
            1
        );

        INSERT INTO session_mapping_stats (
            session_id,
            mapping_id,
            mapping_name,
            keybind,
            threshold_percentage,
            keypress_trigger_threshold_percentage,
            trigger_count
        ) VALUES (
            'session-1',
            'mapping-1',
            'Test mapping',
            'Space',
            100,
            60,
            1
        );

        DELETE FROM patients WHERE id = 'patient-1';
        ",
    )
    .unwrap();

    for table in [
        "patients",
        "presets",
        "movement_mappings",
        "scheduled_sessions",
        "sessions",
        "session_mapping_stats",
    ] {
        assert_eq!(count_rows(&conn, table), 0, "rows remained in {table}");
    }
}
