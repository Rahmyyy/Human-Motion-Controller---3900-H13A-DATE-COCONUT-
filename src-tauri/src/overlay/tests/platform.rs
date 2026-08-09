use tauri::Manager;

use super::test_app;
use crate::overlay::{close_with_main_window, MAIN_LABEL};

/// The overlay is hidden from the taskbar, so a user who closes the main window mid-session
/// would otherwise leave the app running with no visible way to quit it. Registering the hook
/// must work whether or not there is a main window to hang it on.
#[test]
fn the_close_hook_is_registered_only_when_a_main_window_exists() {
    let with_main = test_app();
    close_with_main_window(with_main.handle());
    assert!(with_main.get_webview_window(MAIN_LABEL).is_some());

    let without_main = tauri::test::mock_app();
    close_with_main_window(without_main.handle());
    assert!(without_main.get_webview_window(MAIN_LABEL).is_none());
}

/// The platform shim differs per target — macOS routes the overlay through an NSPanel, which no
/// mock runtime can stand in for — so these cover the standard (Windows/Linux) implementation.
#[cfg(not(target_os = "macos"))]
mod standard {
    use super::*;
    use crate::overlay::platform;

    use super::super::{open, overlay_window};

    #[test]
    fn configuring_an_overlay_is_a_no_op() {
        let app = test_app();
        open(&app).unwrap();

        assert!(platform::configure(&overlay_window(&app).unwrap()).is_ok());
    }

    #[test]
    fn showing_an_existing_overlay_succeeds() {
        let app = test_app();
        open(&app).unwrap();
        let overlay = overlay_window(&app).unwrap();

        assert!(platform::show(app.handle(), &overlay).is_ok());
    }

    #[test]
    fn closing_without_an_overlay_is_a_no_op() {
        let app = test_app();

        assert!(platform::close(app.handle()).is_ok());
    }

    #[test]
    fn closing_an_open_overlay_succeeds() {
        let app = test_app();
        open(&app).unwrap();

        assert!(platform::close(app.handle()).is_ok());
    }
}
