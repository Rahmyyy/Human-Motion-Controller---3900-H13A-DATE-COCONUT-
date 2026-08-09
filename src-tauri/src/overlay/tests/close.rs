use std::sync::mpsc;
use std::time::Duration;

use tauri::{test::mock_app, Listener};

use super::{close, open, summary, test_app};
use crate::native::contract::SessionSummaryDto;
use crate::overlay::MAIN_LABEL;
use tauri::Manager;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionEnded {
    session_id: String,
    summary: SessionSummaryDto,
}

/// The overlay owns the live session state, so closing it has to hand the final stats to the
/// main window — otherwise the main window has no way to leave the session screen.
#[test]
fn closing_hands_the_final_summary_to_the_main_window() {
    let app = test_app();
    let (sender, receiver) = mpsc::channel();
    app.get_webview_window(MAIN_LABEL)
        .unwrap()
        .listen("session-ended", move |event| {
            let _ = sender.send(event.payload().to_string());
        });
    open(&app).unwrap();

    close(&app).unwrap();

    let payload = receiver
        .recv_timeout(Duration::from_secs(5))
        .expect("the main window should be told the session ended");
    let event: SessionEnded = serde_json::from_str(&payload).unwrap();

    assert_eq!(event.session_id, "session-1");
    assert_eq!(event.summary, summary());
}

#[test]
fn closing_succeeds_when_no_overlay_was_ever_opened() {
    let app = test_app();

    assert!(close(&app).is_ok());
}

/// Both End Session buttons route through this command, so a stale main window must not turn a
/// close into an error that strands the user in a session that has already ended.
#[test]
fn closing_succeeds_without_a_main_window() {
    let app = mock_app();

    let result = tauri::async_runtime::block_on(crate::overlay::close_overlay(
        app.handle().clone(),
        "session-1".to_string(),
        summary(),
    ));

    assert!(result.is_ok());
}

#[test]
fn closing_twice_is_not_an_error() {
    let app = test_app();
    open(&app).unwrap();

    assert!(close(&app).is_ok());
    assert!(close(&app).is_ok());
}
