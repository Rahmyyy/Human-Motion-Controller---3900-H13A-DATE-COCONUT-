mod commands;
mod repository;
mod service_create;
mod service_update;

use std::sync::Mutex;

use rusqlite::Connection;
use tauri::{test::MockRuntime, App, Manager};

use super::{repository as mapping_repository, service, validation};
use crate::{db::DbState, test_support::setup_test_conn};

fn create_mapping(conn: &Connection) -> String {
    service::create_movement_mapping(
        conn,
        "preset-1",
        "Squat",
        "S",
        "Click",
        "[[1,2,3]]",
        &[11, 12],
        60,
    )
    .unwrap();

    service::get_movement_mappings(conn, "preset-1").unwrap()[0]
        .id
        .clone()
}

fn mock_app_with(conn: Connection) -> App<MockRuntime> {
    let app = tauri::test::mock_app();
    assert!(app.manage(DbState {
        conn: Mutex::new(conn),
    }));
    app
}

fn raw_mapping<'a>(id: &'a str, created_at: &'a str) -> mapping_repository::NewMovementMapping<'a> {
    mapping_repository::NewMovementMapping {
        id,
        preset_id: "preset-1",
        name: "Squat",
        keybind: "S",
        keypress_type: "Click",
        pose_frames_json: "[]",
        selected_landmarks_json: "[11,12]",
        keypress_trigger_threshold_percentage: 60,
        created_at,
    }
}
