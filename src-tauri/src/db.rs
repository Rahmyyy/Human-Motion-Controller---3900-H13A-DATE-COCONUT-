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
            created_at TEXT NOT NULL
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

    Ok(DbState {
        conn: Mutex::new(conn),
    })
}
