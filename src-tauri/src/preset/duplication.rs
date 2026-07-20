use anyhow::Result;
use rusqlite::{params, Connection};

pub fn duplicate_preset_data(
    conn: &mut Connection,
    source_id: &str,
    duplicate_id: &str,
    duplicate_name: &str,
    created_at: &str,
) -> Result<()> {
    let transaction = conn.transaction()?;

    transaction.execute(
        "INSERT INTO presets (id, name, created_at) VALUES (?1, ?2, ?3)",
        params![duplicate_id, duplicate_name, created_at],
    )?;

    transaction.execute(
        "
        INSERT INTO movement_mappings (
            id, preset_id, name, keybind, pose_frames_json, created_at
        )
        SELECT
            ?1 || '-mapping-' || id,
            ?1,
            name,
            keybind,
            pose_frames_json,
            ?2
        FROM movement_mappings
        WHERE preset_id = ?3
        ",
        params![duplicate_id, created_at, source_id],
    )?;

    transaction.commit()?;
    Ok(())
}
