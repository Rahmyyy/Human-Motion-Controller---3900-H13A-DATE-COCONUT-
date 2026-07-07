use crate::movement_mapping_repository::{self, MovementMappingDetails, MovementMappingSummary};
use anyhow::{anyhow, Result};
use rusqlite::Connection;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn create_movement_mapping(
    conn: &Connection,
    preset_id: &str,
    name: &str,
    keybind: &str,
    pose_frames_json: &str,
) -> Result<()> {
    let name = name.trim();
    let keybind = keybind.trim();

    if name.is_empty() {
        return Err(anyhow!("Movement mapping name cannot be empty"));
    }

    if keybind.is_empty() {
        return Err(anyhow!("Movement mapping keybind cannot be empty"));
    }

    if pose_frames_json.trim().is_empty() {
        return Err(anyhow!("Movement mapping pose frames cannot be empty"));
    }

    let now = SystemTime::now().duration_since(UNIX_EPOCH)?;
    let id = format!("movement-mapping-{}", now.as_nanos());
    let created_at = now.as_secs().to_string();

    movement_mapping_repository::insert_movement_mapping(
        conn,
        &id,
        preset_id,
        name,
        keybind,
        pose_frames_json,
        &created_at,
    )?;

    Ok(())
}

pub fn get_movement_mappings(
    conn: &Connection,
    preset_id: &str,
) -> Result<Vec<MovementMappingSummary>> {
    movement_mapping_repository::select_movement_mappings_by_preset(conn, preset_id)
}

pub fn get_movement_mapping(
    conn: &Connection,
    id: &str,
    preset_id: &str,
) -> Result<MovementMappingDetails> {
    movement_mapping_repository::select_movement_mapping_by_id(conn, id, preset_id)
}

pub fn update_movement_mapping(
    conn: &Connection,
    id: &str,
    preset_id: &str,
    name: &str,
    keybind: &str,
    pose_frames_json: &str,
) -> Result<()> {
    let name = name.trim();
    let keybind = keybind.trim();

    if name.is_empty() {
        return Err(anyhow!("Movement mapping name cannot be empty"));
    }

    if keybind.is_empty() {
        return Err(anyhow!("Movement mapping keybind cannot be empty"));
    }

    if pose_frames_json.trim().is_empty() {
        return Err(anyhow!("Movement mapping pose frames cannot be empty"));
    }

    let rows_affected = movement_mapping_repository::update_movement_mapping(
        conn,
        id,
        preset_id,
        name,
        keybind,
        pose_frames_json,
    )?;

    if rows_affected == 0 {
        return Err(anyhow!("Movement mapping not found"));
    }

    Ok(())
}

pub fn delete_movement_mapping(conn: &Connection, id: &str, preset_id: &str) -> Result<()> {
    let rows_affected = movement_mapping_repository::delete_movement_mapping(conn, id, preset_id)?;

    if rows_affected == 0 {
        return Err(anyhow!("Movement mapping not found"));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "
            CREATE TABLE movement_mappings (
                id TEXT PRIMARY KEY,
                preset_id TEXT NOT NULL,
                name TEXT NOT NULL,
                keybind TEXT NOT NULL,
                pose_frames_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            ",
            [],
        )
        .unwrap();
        conn
    }

    #[test]
    fn update_then_delete_round_trip() {
        let conn = setup_conn();
        create_movement_mapping(&conn, "preset-1", "Squat", "S", "[]").unwrap();

        let mappings = get_movement_mappings(&conn, "preset-1").unwrap();
        assert_eq!(mappings.len(), 1);
        let id = mappings[0].id.clone();

        update_movement_mapping(&conn, &id, "preset-1", "Squat Deep", "D", "[[1,2,3]]").unwrap();

        let updated = get_movement_mapping(&conn, &id, "preset-1").unwrap();
        assert_eq!(updated.name, "Squat Deep");
        assert_eq!(updated.keybind, "D");
        assert_eq!(updated.pose_frames_json, "[[1,2,3]]");

        delete_movement_mapping(&conn, &id, "preset-1").unwrap();

        let after_delete = get_movement_mapping(&conn, &id, "preset-1");
        assert!(after_delete.is_err());
    }

    #[test]
    fn update_missing_mapping_errors() {
        let conn = setup_conn();
        let result =
            update_movement_mapping(&conn, "does-not-exist", "preset-1", "Name", "K", "[]");
        assert!(result.is_err());
    }

    #[test]
    fn delete_missing_mapping_errors() {
        let conn = setup_conn();
        let result = delete_movement_mapping(&conn, "does-not-exist", "preset-1");
        assert!(result.is_err());
    }

    #[test]
    fn update_rejects_empty_fields() {
        let conn = setup_conn();
        create_movement_mapping(&conn, "preset-1", "Squat", "S", "[]").unwrap();
        let mappings = get_movement_mappings(&conn, "preset-1").unwrap();
        let id = mappings[0].id.clone();

        let result = update_movement_mapping(&conn, &id, "preset-1", "  ", "K", "[]");
        assert!(result.is_err());
    }
}
