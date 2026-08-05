use tauri::{AppHandle, Manager as _};

use super::OVERLAY_LABEL;

pub const SHOW_ON_BUILD: bool = true;

pub fn configure(_: &tauri::WebviewWindow) -> Result<(), String> {
    Ok(())
}

pub fn show(_: &AppHandle, overlay: &tauri::WebviewWindow) -> Result<(), String> {
    overlay.show().map_err(|error| error.to_string())
}

pub fn close(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
        window.close().map_err(|error| error.to_string())?;
    }

    Ok(())
}
