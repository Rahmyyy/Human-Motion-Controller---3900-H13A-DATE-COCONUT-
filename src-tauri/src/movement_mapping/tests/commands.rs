use std::panic::{catch_unwind, AssertUnwindSafe};

use rusqlite::Connection;
use tauri::Manager;

use super::*;
use crate::movement_mapping::commands;

#[test]
fn commands_support_the_complete_mapping_lifecycle() {
    let app = mock_app_with(setup_test_conn());

    commands::create_movement_mapping(
        app.state(),
        "preset-1".into(),
        "Squat".into(),
        "S".into(),
        "Click".into(),
        "[]".into(),
        vec![11, 12],
        60,
    )
    .unwrap();

    let mappings = commands::get_movement_mappings(app.state(), "preset-1".into()).unwrap();
    assert_eq!(mappings.len(), 1);
    let id = mappings[0].id.clone();

    let mapping =
        commands::get_movement_mapping(app.state(), id.clone(), "preset-1".into()).unwrap();
    assert_eq!(mapping.name, "Squat");

    commands::update_movement_mapping(
        app.state(),
        id.clone(),
        "preset-1".into(),
        "Deep Squat".into(),
        "D".into(),
        "Press".into(),
        "[[1]]".into(),
        vec![13],
        70,
    )
    .unwrap();
    commands::update_movement_mapping_threshold(app.state(), id.clone(), "preset-1".into(), 55)
        .unwrap();
    commands::delete_movement_mapping(app.state(), id, "preset-1".into()).unwrap();
}

#[test]
fn commands_attach_stable_codes_to_operation_errors() {
    let app = mock_app_with(Connection::open_in_memory().unwrap());

    let create = commands::create_movement_mapping(
        app.state(),
        "preset".into(),
        "Squat".into(),
        "S".into(),
        "Click".into(),
        "[]".into(),
        vec![11],
        60,
    )
    .unwrap_err();
    assert_eq!(create.code, "movement_mapping_create_failed");

    let list = commands::get_movement_mappings(app.state(), "preset".into()).unwrap_err();
    assert_eq!(list.code, "movement_mapping_list_failed");

    let get =
        commands::get_movement_mapping(app.state(), "mapping".into(), "preset".into()).unwrap_err();
    assert_eq!(get.code, "movement_mapping_get_failed");

    let update = commands::update_movement_mapping(
        app.state(),
        "mapping".into(),
        "preset".into(),
        "Squat".into(),
        "S".into(),
        "Click".into(),
        "[]".into(),
        vec![11],
        60,
    )
    .unwrap_err();
    assert_eq!(update.code, "movement_mapping_update_failed");

    let delete = commands::delete_movement_mapping(app.state(), "mapping".into(), "preset".into())
        .unwrap_err();
    assert_eq!(delete.code, "movement_mapping_delete_failed");

    let threshold = commands::update_movement_mapping_threshold(
        app.state(),
        "mapping".into(),
        "preset".into(),
        50,
    )
    .unwrap_err();
    assert_eq!(threshold.code, "movement_mapping_threshold_update_failed");
}

#[test]
fn every_command_reports_a_poisoned_database_lock() {
    let app = mock_app_with(setup_test_conn());
    let state = app.state::<crate::db::DbState>();
    let _ = catch_unwind(AssertUnwindSafe(|| {
        let _guard = state.conn.lock().unwrap();
        panic!("poison test database lock");
    }));

    let create = commands::create_movement_mapping(
        app.state(),
        "preset-1".into(),
        "A".into(),
        "A".into(),
        "Click".into(),
        "[]".into(),
        vec![11],
        60,
    );
    let list = commands::get_movement_mappings(app.state(), "preset-1".into());
    let get = commands::get_movement_mapping(app.state(), "id".into(), "preset-1".into());
    let update = commands::update_movement_mapping(
        app.state(),
        "id".into(),
        "preset-1".into(),
        "A".into(),
        "A".into(),
        "Click".into(),
        "[]".into(),
        vec![11],
        60,
    );
    let delete = commands::delete_movement_mapping(app.state(), "id".into(), "preset-1".into());
    let threshold = commands::update_movement_mapping_threshold(
        app.state(),
        "id".into(),
        "preset-1".into(),
        50,
    );

    for error in [
        create.unwrap_err(),
        list.unwrap_err(),
        get.unwrap_err(),
        update.unwrap_err(),
        delete.unwrap_err(),
        threshold.unwrap_err(),
    ] {
        assert_eq!(error.code, "database_lock_failed");
    }
}
