use std::{fs, sync::Mutex};

use anyhow::Result;
use rusqlite::Connection;
use tauri::{AppHandle, Manager};

pub struct DbState {
    pub conn: Mutex<Connection>,
}

pub fn init_db(app: &AppHandle) -> Result<DbState> {
    let app_data_dir = app.path().app_data_dir()?;
    fs::create_dir_all(&app_data_dir)?;

    let db_path = app_data_dir.join("human-controller.sqlite");
    let conn = Connection::open(db_path)?;

    conn.execute("PRAGMA foreign_keys = ON", [])?;
    conn.execute(
        "
        CREATE TABLE IF NOT EXISTS patients (
            id TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            clinical_notes TEXT,
            created_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'needsReview')),
            last_activity_at_ms INTEGER NOT NULL DEFAULT 0
        )
        ",
        [],
    )?;

    conn.execute(
        "
        CREATE TABLE IF NOT EXISTS presets (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            default_pose_frames_json TEXT,
            FOREIGN KEY (patient_id)
                REFERENCES patients(id)
                ON DELETE CASCADE
        )
        ",
        [],
    )?;

    conn.execute(
        "
        CREATE TABLE IF NOT EXISTS movement_mappings (
            id TEXT PRIMARY KEY,
            preset_id TEXT NOT NULL,
            name TEXT NOT NULL,
            keybind TEXT NOT NULL,
            keypress_type TEXT NOT NULL,
            pose_frames_json TEXT NOT NULL,
            selected_landmarks_json TEXT NOT NULL,
            threshold_percentage INTEGER NOT NULL DEFAULT 100,
            keypress_trigger_threshold_percentage INTEGER NOT NULL DEFAULT 60
                CHECK (keypress_trigger_threshold_percentage BETWEEN 30 AND 100),
            created_at TEXT NOT NULL,
            FOREIGN KEY (preset_id)
                REFERENCES presets(id)
                ON DELETE CASCADE
        )
        ",
        [],
    )?;

    conn.execute(
        "
        CREATE TABLE IF NOT EXISTS scheduled_sessions (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            scheduled_at_ms INTEGER NOT NULL,
            created_at_ms INTEGER NOT NULL,
            FOREIGN KEY (patient_id)
                REFERENCES patients(id)
                ON DELETE CASCADE
        )
        ",
        [],
    )?;

    conn.execute(
        "
        CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_scheduled_at
        ON scheduled_sessions(scheduled_at_ms)
        ",
        [],
    )?;

    // One row per completed session. `preset_id` is deliberately a snapshot rather than a
    // foreign key: history has to survive the preset being deleted, and the patient history
    // page groups sessions by preset, so nulling the id would collapse unrelated presets
    // into one bucket. `preset_name` is snapshotted for the same reason — a rename must not
    // rewrite what past sessions were run with.
    conn.execute(
        "
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            preset_id TEXT NOT NULL,
            preset_name TEXT NOT NULL,
            started_at_ms INTEGER NOT NULL,
            ended_at_ms INTEGER NOT NULL,
            duration_ms INTEGER NOT NULL,
            trigger_count INTEGER NOT NULL,
            FOREIGN KEY (patient_id)
                REFERENCES patients(id)
                ON DELETE CASCADE
        )
        ",
        [],
    )?;

    conn.execute(
        "
        CREATE INDEX IF NOT EXISTS idx_sessions_patient_started_at
            ON sessions (patient_id, started_at_ms DESC)
        ",
        [],
    )?;

    // Per-mapping breakdown of a completed session. Every mapping in the preset gets a row,
    // including ones that never fired, because the threshold chart plots the settings a
    // session ran with. `mapping_id` is a snapshot for the same reason as `preset_id` above.
    conn.execute(
        "
        CREATE TABLE IF NOT EXISTS session_mapping_stats (
            session_id TEXT NOT NULL,
            mapping_id TEXT NOT NULL,
            mapping_name TEXT NOT NULL,
            keybind TEXT NOT NULL,
            threshold_percentage INTEGER NOT NULL,
            keypress_trigger_threshold_percentage INTEGER NOT NULL,
            trigger_count INTEGER NOT NULL,
            PRIMARY KEY (session_id, mapping_id),
            FOREIGN KEY (session_id)
                REFERENCES sessions(id)
                ON DELETE CASCADE
        )
        ",
        [],
    )?;

    Ok(DbState {
        conn: Mutex::new(conn),
    })
}
