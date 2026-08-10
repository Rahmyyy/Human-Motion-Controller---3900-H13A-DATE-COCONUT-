use std::{cell::Cell, fs};

use tauri::{test, Manager, WebviewWindowBuilder};
use tempfile::tempdir;

use super::{configure_builder, initialize_app, logging_plugin};
use crate::db::DbState;

/// The origin Tauri serves the app from, which decides whether the IPC counts as
/// local. Windows and Android use `http://tauri.localhost`; everywhere else uses
/// the `tauri://` custom protocol. A mismatch makes Tauri treat the request as
/// remote web content and reject it against the mock context's empty ACL.
const APP_ORIGIN: &str = if cfg!(any(windows, target_os = "android")) {
    "http://tauri.localhost"
} else {
    "tauri://localhost"
};

fn invoke_request(command: &str, body: serde_json::Value) -> tauri::webview::InvokeRequest {
    tauri::webview::InvokeRequest {
        cmd: command.into(),
        callback: tauri::ipc::CallbackFn(0),
        error: tauri::ipc::CallbackFn(1),
        url: APP_ORIGIN.parse().unwrap(),
        body: body.into(),
        headers: Default::default(),
        invoke_key: test::INVOKE_KEY.to_string(),
    }
}

#[test]
fn initialize_app_registers_database_state_menu_and_input_backend() {
    let mut app = test::mock_app();
    let temp_dir = tempdir().unwrap();
    let input_initialized = Cell::new(false);
    let menu_installed = Cell::new(false);

    initialize_app(
        &mut app,
        temp_dir.path(),
        || {
            input_initialized.set(true);
            Ok(())
        },
        |_| {
            menu_installed.set(true);
            Ok(())
        },
    )
    .unwrap();

    assert!(input_initialized.get());
    assert!(menu_installed.get());
    assert!(app.try_state::<DbState>().is_some());
}

#[test]
fn initialize_app_stops_before_side_effects_when_database_setup_fails() {
    let mut app = test::mock_app();
    let temp_dir = tempdir().unwrap();
    let file_in_the_way = temp_dir.path().join("not-a-directory");
    fs::write(&file_in_the_way, "blocking file").unwrap();
    let input_initialized = Cell::new(false);

    let result = initialize_app(
        &mut app,
        &file_in_the_way.join("app-data"),
        || {
            input_initialized.set(true);
            Ok(())
        },
        |_| panic!("menu installation must not run after database failure"),
    );

    assert!(result.is_err());
    assert!(!input_initialized.get());
    assert!(app.try_state::<DbState>().is_none());
}

#[test]
fn initialize_app_propagates_menu_installation_failure() {
    let mut app = test::mock_app();
    let temp_dir = tempdir().unwrap();
    let input_initialized = Cell::new(false);

    let result = initialize_app(
        &mut app,
        temp_dir.path(),
        || {
            input_initialized.set(true);
            Ok(())
        },
        |_| Err(tauri::Error::AssetNotFound("test menu".into())),
    );

    assert!(result.is_err());
    assert!(input_initialized.get());
    assert!(app.try_state::<DbState>().is_some());
}

#[test]
fn configured_mock_builder_registers_commands() {
    let app = configure_builder(test::mock_builder(), logging_plugin(true))
        .build(test::mock_context(test::noop_assets()))
        .unwrap();
    let temp_dir = tempdir().unwrap();
    let db_state = crate::db::init_db(temp_dir.path()).unwrap();
    assert!(app.manage(db_state));

    let webview = WebviewWindowBuilder::new(&app, "main", Default::default())
        .build()
        .unwrap();
    let response = test::get_ipc_response(
        &webview,
        invoke_request("get_patients", serde_json::json!({})),
    )
    .unwrap();

    let patients = response.deserialize::<serde_json::Value>().unwrap();
    assert_eq!(patients, serde_json::json!([]));

    let error = test::get_ipc_response(
        &webview,
        invoke_request("get_patient", serde_json::json!({ "id": "missing" })),
    )
    .unwrap_err();
    assert_eq!(error["code"], "patient_get_failed");
}

#[test]
fn logging_plugin_supports_production_and_test_modes() {
    drop(logging_plugin::<tauri::test::MockRuntime>(false));
    drop(logging_plugin::<tauri::test::MockRuntime>(true));
}
