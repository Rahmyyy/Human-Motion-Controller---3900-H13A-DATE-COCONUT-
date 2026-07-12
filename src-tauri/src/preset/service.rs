use super::repository::{self, Preset};
use anyhow::{anyhow, Result};
use rusqlite::Connection;
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_PRESET_NAME_LENGTH: usize = 60;

pub fn create_preset(conn: &Connection, name: &str) -> Result<Preset> {
    let name = name.trim();

    if name.is_empty() {
        return Err(anyhow!("Preset name cannot be empty"));
    }

    if name.chars().count() > MAX_PRESET_NAME_LENGTH {
        return Err(anyhow!(
            "Preset name cannot exceed {MAX_PRESET_NAME_LENGTH} characters"
        ));
    }

    let now = SystemTime::now().duration_since(UNIX_EPOCH)?;
    let id = format!("preset-{}", now.as_nanos());
    let created_at = now.as_secs().to_string();

    repository::insert_preset(conn, &id, name, &created_at)?;
    repository::select_preset_by_id(conn, &id)
}

pub fn get_presets(conn: &Connection) -> Result<Vec<Preset>> {
    repository::select_presets(conn)
}

pub fn get_preset(conn: &Connection, id: &str) -> Result<Preset> {
    if id.trim().is_empty() {
        return Err(anyhow!("Preset ID cannot be empty"));
    }

    repository::select_preset_by_id(conn, id)
}

#[cfg(test)]
#[path = "service_tests.rs"]
mod tests;
