use std::fs;
use std::sync::Mutex;

use tauri::{test::mock_app, test::MockRuntime, App, Manager};

use super::{
    base_patient, count, export_json, seed_source_patient, temp_json_path, write_temp_json,
};
use crate::db::DbState;
use crate::patient_transfer::commands::{export_patient, import_patient, preview_import_patient};
use crate::test_support::setup_test_conn;

fn seeded_state() -> DbState {
    let conn = setup_test_conn();
    seed_source_patient(&conn);
    DbState {
        conn: Mutex::new(conn),
    }
}

/// Poisons the connection mutex so the command handlers take their lock-failure branch. The
/// panic below is deliberate and is caught immediately; the test harness captures its message
/// and only prints it if the test itself fails.
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

/// Commands read their connection out of Tauri's managed state, so they can only be called
/// through an app that manages a `DbState`.
fn test_app(state: DbState) -> App<MockRuntime> {
    let app = mock_app();
    assert!(app.manage(state));
    app
}

#[test]
fn a_patient_can_be_exported_previewed_and_imported_through_the_commands() {
    let app = test_app(seeded_state());
    let path = temp_json_path("command-round-trip");

    export_patient(app.state(), "patient-1".to_string(), path.clone()).unwrap();
    assert_eq!(
        preview_import_patient(path.clone()).unwrap(),
        "Test Patient"
    );

    let imported = import_patient(app.state(), path.clone()).unwrap();
    fs::remove_file(&path).ok();

    assert_ne!(imported.id, "patient-1");
    assert_eq!(imported.display_name, "Test Patient");
    assert_eq!(imported.preset_count, 1);
    assert_eq!(
        count(&app.state::<DbState>().conn.lock().unwrap(), "patients"),
        2
    );
}

#[test]
fn service_failures_are_mapped_to_stable_error_codes() {
    let app = test_app(seeded_state());
    let missing = temp_json_path("never-written");

    let export_error =
        export_patient(app.state(), "  ".to_string(), temp_json_path("blank")).unwrap_err();
    assert_eq!(export_error.code, "patient_export_failed");
    assert_eq!(export_error.message, "Patient ID cannot be empty");

    let preview_error = preview_import_patient(missing.clone()).unwrap_err();
    assert_eq!(preview_error.code, "patient_import_preview_failed");
    assert_eq!(preview_error.message, "Could not read the selected file");

    let import_error = import_patient(app.state(), missing).unwrap_err();
    assert_eq!(import_error.code, "patient_import_failed");
    assert_eq!(import_error.message, "Could not read the selected file");
}

#[test]
fn a_poisoned_connection_lock_fails_the_commands_that_need_the_database() {
    let app = test_app(poisoned_state());
    let path = write_temp_json("poisoned", &export_json(base_patient()));

    let export_error =
        export_patient(app.state(), "patient-1".to_string(), path.clone()).unwrap_err();
    let import_error = import_patient(app.state(), path.clone()).unwrap_err();

    // Preview never touches the database, so it still works while the lock is poisoned.
    let preview = preview_import_patient(path.clone());
    fs::remove_file(&path).ok();

    assert_eq!(export_error.code, "database_lock_failed");
    assert_eq!(import_error.code, "database_lock_failed");
    assert_eq!(preview.unwrap(), "Imported Patient");
}
