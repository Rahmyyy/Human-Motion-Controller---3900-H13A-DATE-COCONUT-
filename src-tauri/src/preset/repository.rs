use anyhow::Result;
use rusqlite::{params, Connection};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Preset {
    pub id: String,
    pub name: String,
    pub created_at: String,
}

pub fn insert_preset(conn: &Connection, id: &str, name: &str, created_at: &str) -> Result<()> {
    conn.execute(
        "
        INSERT INTO presets (
            id,
            name,
            created_at
        ) VALUES (?1, ?2, ?3)
        ",
        params![id, name, created_at],
    )?;

    Ok(())
}

pub fn select_presets(conn: &Connection) -> Result<Vec<Preset>> {
    let mut statement = conn.prepare(
        "
        SELECT id, name, created_at
        FROM presets
        ORDER BY created_at DESC
        ",
    )?;

    let presets = statement
        .query_map([], |row| {
            Ok(Preset {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(presets)
}

pub fn select_preset_by_id(conn: &Connection, id: &str) -> Result<Preset> {
    let mut statement = conn.prepare(
        "
        SELECT id, name, created_at
        FROM presets
        WHERE id = ?1
        ",
    )?;

    let preset = statement.query_row(params![id], |row| {
        Ok(Preset {
            id: row.get(0)?,
            name: row.get(1)?,
            created_at: row.get(2)?,
        })
    })?;

    Ok(preset)
}
