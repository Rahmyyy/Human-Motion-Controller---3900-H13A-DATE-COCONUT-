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

    ensure_keypress_trigger_threshold_column(&conn)?;

    Ok(DbState {
        conn: Mutex::new(conn),
    })
}

fn ensure_keypress_trigger_threshold_column(conn: &Connection) -> Result<()> {
    let mut statement = conn.prepare("PRAGMA table_info(movement_mappings)")?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;

    if !columns
        .iter()
        .any(|column| column == "keypress_trigger_threshold_percentage")
    {
        conn.execute(
            "
            ALTER TABLE movement_mappings
            ADD COLUMN keypress_trigger_threshold_percentage INTEGER NOT NULL DEFAULT 60
                CHECK (keypress_trigger_threshold_percentage BETWEEN 30 AND 100)
            ",
            [],
        )?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::ensure_keypress_trigger_threshold_column;
    use rusqlite::{params, Connection};

    #[test]
    fn migration_backfills_existing_mappings_with_current_keypress_threshold() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "
            CREATE TABLE movement_mappings (
                id TEXT PRIMARY KEY,
                threshold_percentage INTEGER NOT NULL DEFAULT 100
            );
            INSERT INTO movement_mappings (id) VALUES ('mapping-1');
            ",
        )
        .unwrap();

        ensure_keypress_trigger_threshold_column(&conn).unwrap();

        let threshold: u32 = conn
            .query_row(
                "
                SELECT keypress_trigger_threshold_percentage
                FROM movement_mappings
                WHERE id = ?1
                ",
                params!["mapping-1"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(threshold, 60);
    }
}
