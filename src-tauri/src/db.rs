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
            name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            default_pose_frames_json TEXT
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
            pose_frames_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (preset_id)
                REFERENCES presets(id)
                ON DELETE CASCADE
        )
        ",
        [],
    )?;

    Ok(DbState {
        conn: Mutex::new(conn),
    })
}
