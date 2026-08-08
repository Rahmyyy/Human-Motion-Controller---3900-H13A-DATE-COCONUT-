use std::fs;

use rusqlite::Connection;
use tempfile::tempdir;

use super::{count_rows, test_conn};
use crate::db::{init_db, initialize_connection};

#[test]
fn init_db_creates_the_directory_file_and_schema() {
    let temp_dir = tempdir().unwrap();
    let app_data_dir = temp_dir.path().join("nested").join("app-data");

    let state = init_db(&app_data_dir).unwrap();

    assert!(app_data_dir.is_dir());
    assert!(app_data_dir.join("human-controller.sqlite").is_file());

    let conn = state.conn.lock().unwrap();
    let foreign_keys_enabled: bool = conn
        .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
        .unwrap();

    assert!(foreign_keys_enabled);
    assert_eq!(count_rows(&conn, "patients"), 0);
}

#[test]
fn init_db_reports_when_the_data_directory_cannot_be_created() {
    let temp_dir = tempdir().unwrap();
    let file_in_the_way = temp_dir.path().join("not-a-directory");
    fs::write(&file_in_the_way, "blocking file").unwrap();

    let error = init_db(&file_in_the_way.join("app-data"))
        .err()
        .expect("a child directory cannot be created beneath a file");

    assert!(
        format!("{error:#}").contains("failed to create application data directory"),
        "unexpected error: {error:#}"
    );
}

#[test]
fn init_db_reports_when_the_database_file_cannot_be_opened() {
    let temp_dir = tempdir().unwrap();
    let database_path = temp_dir.path().join("human-controller.sqlite");
    fs::create_dir(&database_path).unwrap();

    let error = init_db(temp_dir.path())
        .err()
        .expect("SQLite cannot open a directory as a database file");

    assert!(
        format!("{error:#}").contains("failed to open database file"),
        "unexpected error: {error:#}"
    );
}

#[test]
fn init_db_reports_an_incompatible_existing_schema() {
    let temp_dir = tempdir().unwrap();
    let database_path = temp_dir.path().join("human-controller.sqlite");
    let conn = Connection::open(&database_path).unwrap();
    conn.execute_batch("CREATE VIEW scheduled_sessions AS SELECT 1 AS scheduled_at_ms;")
        .unwrap();
    drop(conn);

    let error = init_db(temp_dir.path())
        .err()
        .expect("SQLite cannot create the scheduled-session index on a view");

    assert!(
        format!("{error:#}").contains("failed to initialize database schema"),
        "unexpected error: {error:#}"
    );
}

#[test]
fn initializes_the_complete_schema_and_is_idempotent() {
    let conn = test_conn();
    conn.execute(
        "
        INSERT INTO patients (id, display_name, created_at)
        VALUES ('patient-1', 'Test patient', '0')
        ",
        [],
    )
    .unwrap();

    initialize_connection(&conn).unwrap();

    let table_count: i64 = conn
        .query_row(
            "
            SELECT COUNT(*)
            FROM sqlite_schema
            WHERE type = 'table'
              AND name IN (
                'patients',
                'presets',
                'movement_mappings',
                'scheduled_sessions',
                'sessions',
                'session_mapping_stats'
              )
            ",
            [],
            |row| row.get(0),
        )
        .unwrap();
    let index_count: i64 = conn
        .query_row(
            "
            SELECT COUNT(*)
            FROM sqlite_schema
            WHERE type = 'index'
              AND name IN (
                'idx_scheduled_sessions_scheduled_at',
                'idx_sessions_patient_started_at'
              )
            ",
            [],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(table_count, 6);
    assert_eq!(index_count, 2);
    assert_eq!(count_rows(&conn, "patients"), 1);
}
