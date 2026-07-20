use super::repository;
use anyhow::{anyhow, Result};
use rusqlite::Connection;

pub fn delete_preset(conn: &Connection, id: &str) -> Result<()> {
    if id.trim().is_empty() {
        return Err(anyhow!("Preset ID cannot be empty"));
    }

    let rows_affected = repository::delete_preset(conn, id)?;
    if rows_affected == 0 {
        return Err(anyhow!("Preset not found"));
    }

    Ok(())
}

#[cfg(test)]
#[path = "deletion_tests.rs"]
mod tests;
