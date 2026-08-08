use rusqlite::Connection;

pub fn setup_test_conn() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    crate::db::initialize_connection(&conn).unwrap();

    conn.execute_batch(
        "
        INSERT INTO patients (
            id,
            display_name,
            clinical_notes,
            created_at,
            status,
            last_activity_at_ms
        ) VALUES (
            'patient-1',
            'Test Patient',
            NULL,
            '0',
            'active',
            0
        );

        INSERT INTO presets (
            id,
            patient_id,
            name,
            created_at,
            default_pose_frames_json
        ) VALUES (
            'preset-1',
            'patient-1',
            'Test Preset',
            '0',
            '[]'
        );
        ",
    )
    .unwrap();

    conn
}
