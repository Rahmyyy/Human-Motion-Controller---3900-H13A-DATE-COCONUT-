use std::fs;

use anyhow::Result;
use rusqlite::Connection;
use tauri::{AppHandle, Manager};

pub fn init_db(app: &AppHandle) -> Result<Connection> {
    let app_data_dir = app.path().app_data_dir()?;
    fs::create_dir_all(&app_data_dir)?;

    let db_path = app_data_dir.join("human-controller.sqlite");
    let conn = Connection::open(db_path)?;

    conn.execute(
        "
        CREATE TABLE IF NOT EXISTS movement_mappings (
            id TEXT PRIMARY KEY,
            preset_id TEXT NOT NULL,
            name TEXT NOT NULL,
            keybind TEXT NOT NULL,
            pose_frames_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        ",
        [],
    )?;

    Ok(conn)
}
