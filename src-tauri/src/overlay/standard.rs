use tauri::{AppHandle, Manager as _, Runtime, WebviewWindow};

use super::OVERLAY_LABEL;

pub const SHOW_ON_BUILD: bool = true;

pub trait OverlayRuntime: Runtime {}

impl<R: Runtime> OverlayRuntime for R {}

pub fn configure<R: OverlayRuntime>(_: &WebviewWindow<R>) -> Result<(), String> {
    Ok(())
}

pub fn show<R: OverlayRuntime>(_: &AppHandle<R>, overlay: &WebviewWindow<R>) -> Result<(), String> {
    overlay.show().map_err(|error| error.to_string())
}

pub fn close<R: OverlayRuntime>(app: &AppHandle<R>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
        window.close().map_err(|error| error.to_string())?;
    }

    Ok(())
}
