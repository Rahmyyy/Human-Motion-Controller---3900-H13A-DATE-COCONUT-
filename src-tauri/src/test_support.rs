use rusqlite::Connection;

pub fn setup_test_conn() -> Connection {
    let conn = Connection::open_in_memory().unwrap();

    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;

        CREATE TABLE patients (
            id TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            clinical_notes TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE presets (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            default_pose_frames_json TEXT,
            FOREIGN KEY (patient_id)
                REFERENCES patients(id)
                ON DELETE CASCADE
        );

        CREATE TABLE movement_mappings (
            id TEXT PRIMARY KEY,
            preset_id TEXT NOT NULL,
            name TEXT NOT NULL,
            keybind TEXT NOT NULL,
            pose_frames_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (preset_id)
                REFERENCES presets(id)
                ON DELETE CASCADE
        );

        INSERT INTO patients (
            id,
            display_name,
            clinical_notes,
            created_at
        ) VALUES (
            'patient-1',
            'Test Patient',
            NULL,
            '0'
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
