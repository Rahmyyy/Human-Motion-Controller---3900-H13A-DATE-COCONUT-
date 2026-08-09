use tauri::Manager;

use super::{open, overlay_window, test_app};
use crate::overlay::OVERLAY_LABEL;

#[test]
fn opening_builds_the_overlay_window() {
    let app = test_app();
    assert!(overlay_window(&app).is_none());

    open(&app).unwrap();

    let overlay = overlay_window(&app).expect("the overlay window should exist");
    assert_eq!(overlay.label(), OVERLAY_LABEL);
    assert_ne!(
        overlay.label(),
        app.get_webview_window("main").unwrap().label()
    );
}

/// The route travels in the URL fragment because the frontend uses a HashRouter — every window
/// loads the same entrypoint and picks its screen from the hash.
#[test]
fn the_overlay_url_carries_the_session_route_in_its_fragment() {
    let app = test_app();

    open(&app).unwrap();

    let url = overlay_window(&app).unwrap().url().unwrap();
    assert_eq!(
        url.fragment(),
        Some("/patients/patient-1/presets/preset-1/overlay?sessionId=session-1")
    );
}

/// React strict mode remounts the session page, so two invokes can arrive together. The second
/// must re-show the existing overlay rather than race to build a duplicate, which would fail on
/// the duplicate window label.
#[test]
fn opening_twice_reuses_the_existing_overlay() {
    let app = test_app();

    open(&app).unwrap();
    let first = overlay_window(&app).unwrap();
    open(&app).unwrap();
    let second = overlay_window(&app).unwrap();

    assert_eq!(first.label(), second.label());
    assert_eq!(
        app.webview_windows()
            .keys()
            .filter(|label| *label == OVERLAY_LABEL)
            .count(),
        1
    );
}

#[test]
fn opening_leaves_the_main_window_in_place() {
    let app = test_app();

    open(&app).unwrap();

    assert!(app.get_webview_window("main").is_some());
    assert_eq!(app.webview_windows().len(), 2);
}

/// The overlay can be reopened after being closed, which is what happens when a user starts a
/// second session without restarting the app.
#[test]
fn the_overlay_can_be_opened_again_after_a_close() {
    let app = test_app();

    open(&app).unwrap();
    super::close(&app).unwrap();

    assert!(open(&app).is_ok());
}
