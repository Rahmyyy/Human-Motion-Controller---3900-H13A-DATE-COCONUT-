mod commands;
mod repository;
mod service;
mod validation;

use std::sync::Mutex;

use rusqlite::Connection;
use tauri::{test::mock_app, test::MockRuntime, App, Manager};

use crate::{db::DbState, test_support::setup_test_conn};

/// A connection with no tables at all. Every repository statement fails against it,
/// which is how the SQL error paths that the service layer propagates get exercised.
fn conn_without_schema() -> Connection {
    Connection::open_in_memory().unwrap()
}

fn count_patients(conn: &Connection) -> i64 {
    conn.query_row("SELECT COUNT(*) FROM patients", [], |row| row.get(0))
        .unwrap()
}

fn seeded_state() -> DbState {
    DbState {
        conn: Mutex::new(setup_test_conn()),
    }
}

fn broken_state() -> DbState {
    DbState {
        conn: Mutex::new(conn_without_schema()),
    }
}

/// Poisons the connection mutex so the command handlers take their lock-failure
/// branch. The panic below is deliberate and is caught immediately; the test
/// harness captures its message and only prints it if the test itself fails.
fn poisoned_state() -> DbState {
    let state = seeded_state();
    let outcome = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _guard = state.conn.lock().unwrap();
        panic!("poisoning the connection mutex on purpose");
    }));

    assert!(outcome.is_err());
    assert!(state.conn.is_poisoned());
    state
}

/// Commands read their connection out of Tauri's managed state, so they can only be
/// called through an app that manages a `DbState`.
fn test_app(state: DbState) -> App<MockRuntime> {
    let app = mock_app();
    assert!(app.manage(state));
    app
}
