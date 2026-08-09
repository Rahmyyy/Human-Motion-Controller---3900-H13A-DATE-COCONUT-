use tauri::{test, Manager, WebviewWindowBuilder};

use super::summary;
use crate::overlay::OVERLAY_LABEL;
use crate::{configure_builder, logging_plugin};

/// The origin Tauri serves the app from, which decides whether the IPC counts as local. A
/// mismatch makes Tauri treat the request as remote web content and reject it against the mock
/// context's empty ACL.
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

/// Both commands are `async`, so this also proves the generated IPC wrapper resolves their
/// futures rather than handing the frontend a pending promise. Reaching them at all proves they
/// are registered in the invoke handler — a command missing from `generate_handler!` compiles
/// fine and only fails at runtime.
#[test]
fn both_overlay_commands_are_reachable_over_the_ipc_seam() {
    let app = configure_builder(test::mock_builder(), logging_plugin(true))
        .build(test::mock_context(test::noop_assets()))
        .unwrap();
    let webview = WebviewWindowBuilder::new(&app, "main", Default::default())
        .build()
        .unwrap();

    test::get_ipc_response(
        &webview,
        invoke_request(
            "open_overlay",
            serde_json::json!({
                "patientId": "patient-1",
                "presetId": "preset-1",
                "sessionId": "session-1",
            }),
        ),
    )
    .expect("open_overlay should be registered and succeed");
    assert!(app.get_webview_window(OVERLAY_LABEL).is_some());

    test::get_ipc_response(
        &webview,
        invoke_request(
            "close_overlay",
            serde_json::json!({ "sessionId": "session-1", "summary": summary() }),
        ),
    )
    .expect("close_overlay should be registered and succeed");
}

#[test]
fn a_missing_argument_is_rejected_before_the_command_runs() {
    let app = configure_builder(test::mock_builder(), logging_plugin(true))
        .build(test::mock_context(test::noop_assets()))
        .unwrap();
    let webview = WebviewWindowBuilder::new(&app, "main", Default::default())
        .build()
        .unwrap();

    let error = test::get_ipc_response(
        &webview,
        invoke_request(
            "open_overlay",
            serde_json::json!({ "patientId": "patient-1" }),
        ),
    )
    .expect_err("open_overlay needs a preset and a session");

    assert!(
        error.to_string().contains("presetId"),
        "unexpected error: {error}"
    );
    assert!(app.get_webview_window(OVERLAY_LABEL).is_none());
}
