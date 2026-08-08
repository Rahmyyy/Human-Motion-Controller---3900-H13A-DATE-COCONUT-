mod initialization;
mod schema;

use super::initialize_connection;
use rusqlite::Connection;

fn test_conn() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    initialize_connection(&conn).unwrap();
    conn
}

fn count_rows(conn: &Connection, table: &str) -> i64 {
    conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| {
        row.get(0)
    })
    .unwrap()
}
