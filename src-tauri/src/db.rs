use std::{fs, path::Path, sync::Mutex};

use anyhow::{Context, Result};
use rusqlite::Connection;

pub struct DbState {
    pub conn: Mutex<Connection>,
}

pub fn init_db(app_data_dir: &Path) -> Result<DbState> {
    fs::create_dir_all(app_data_dir).with_context(|| {
        format!(
            "failed to create application data directory {}",
            app_data_dir.display()
        )
    })?;

    let db_path = app_data_dir.join("human-controller.sqlite");
    let conn = Connection::open(&db_path)
        .with_context(|| format!("failed to open database file {}", db_path.display()))?;

    initialize_connection(&conn)?;

    Ok(DbState {
        conn: Mutex::new(conn),
    })
}

/// Enables connection-level database settings and ensures the application schema exists.
/// This must be called for every new connection because SQLite foreign keys are per-connection.
pub(crate) fn initialize_connection(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS patients (
            id TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            clinical_notes TEXT,
            created_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'needsReview')),
            last_activity_at_ms INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS presets (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            default_pose_frames_json TEXT,
            FOREIGN KEY (patient_id)
                REFERENCES patients(id)
                ON DELETE CASCADE
        );

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
        );

        CREATE TABLE IF NOT EXISTS scheduled_sessions (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            scheduled_at_ms INTEGER NOT NULL,
            created_at_ms INTEGER NOT NULL,
            FOREIGN KEY (patient_id)
                REFERENCES patients(id)
                ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_scheduled_at
        ON scheduled_sessions(scheduled_at_ms);

        -- One row per completed session. preset_id is deliberately a snapshot rather than a
        -- foreign key: history has to survive preset deletion, and grouping null preset ids
        -- would collapse unrelated presets. preset_name is snapshotted for the same reason.
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
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_patient_started_at
            ON sessions (patient_id, started_at_ms DESC);

        -- Every mapping in a completed session gets a row, including mappings that never
        -- fired, because threshold charts plot the settings that session ran with. mapping_id
        -- and the other mapping fields are historical snapshots.
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
        );
        ",
    )
    .context("failed to initialize database schema")?;

    Ok(())
}

#[cfg(test)]
mod tests;
