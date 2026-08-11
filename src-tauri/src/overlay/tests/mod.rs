mod close;
mod ipc;
mod logic;
mod open;
mod platform;

use std::collections::HashMap;

use tauri::{test::mock_app, test::MockRuntime, App, Manager, WebviewWindowBuilder};

use super::{close_overlay, open_overlay, MAIN_LABEL, OVERLAY_LABEL};
use crate::native::contract::SessionSummaryDto;

/// A mock app with the main window already built, which is the state the overlay commands
/// expect: the overlay is only ever opened from a session running in the main window.
fn test_app() -> App<MockRuntime> {
    let app = mock_app();
    WebviewWindowBuilder::new(&app, MAIN_LABEL, Default::default())
        .build()
        .unwrap();
    app
}

fn summary() -> SessionSummaryDto {
    SessionSummaryDto {
        elapsed_ms: 61_000,
        trigger_count: 7,
        trigger_counts_by_mapping: HashMap::from([("mapping-1".to_string(), 7)]),
    }
}

/// Both commands are `async` because building a webview on the main thread deadlocks WebView2,
/// so every call has to be driven by an executor rather than awaited inline.
fn open(app: &App<MockRuntime>) -> Result<(), String> {
    tauri::async_runtime::block_on(open_overlay(
        app.handle().clone(),
        "patient-1".to_string(),
        "preset-1".to_string(),
        "session-1".to_string(),
    ))
}

fn close(app: &App<MockRuntime>) -> Result<(), String> {
    tauri::async_runtime::block_on(close_overlay(
        app.handle().clone(),
        "session-1".to_string(),
        summary(),
    ))
}

fn overlay_window(app: &App<MockRuntime>) -> Option<tauri::WebviewWindow<MockRuntime>> {
    app.get_webview_window(OVERLAY_LABEL)
}
