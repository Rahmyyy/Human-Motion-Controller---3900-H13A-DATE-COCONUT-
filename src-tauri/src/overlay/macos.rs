use tauri::{AppHandle, Manager as _};
use tauri_nspanel::{
    objc2_app_kit::{NSWindowCollectionBehavior, NSWindowStyleMask},
    tauri_panel, ManagerExt as _, WebviewWindowExt as _,
};

use super::OVERLAY_LABEL;

pub const SHOW_ON_BUILD: bool = false;

tauri_panel! {
    panel!(SessionOverlayPanel {
        config: {
            can_become_key_window: false,
            can_become_main_window: false,
            is_floating_panel: true
        }
    })
}

/// Fullscreen windows live in separate Spaces on macOS. Configure the overlay
/// as a non-activating auxiliary panel before AppKit first shows it.
pub fn configure(overlay: &tauri::WebviewWindow) -> Result<(), String> {
    let app = overlay.app_handle().clone();
    let overlay = overlay.clone();

    run_on_main_thread(&app, move || configure_on_main_thread(&overlay))
}

fn configure_on_main_thread(overlay: &tauri::WebviewWindow) -> Result<(), String> {
    let panel = overlay
        .to_panel::<SessionOverlayPanel>()
        .map_err(|error| error.to_string())?;

    panel.set_style_mask(NSWindowStyleMask::NonactivatingPanel);
    panel.set_hides_on_deactivate(false);
    // Lower floating/status levels remain below fullscreen content on macOS 26.
    panel.set_level(1000);

    let behavior = NSWindowCollectionBehavior::CanJoinAllSpaces
        | NSWindowCollectionBehavior::FullScreenAuxiliary
        | NSWindowCollectionBehavior::CanJoinAllApplications
        | NSWindowCollectionBehavior::Stationary;
    panel.set_collection_behavior(behavior);

    overlay
        .app_handle()
        .set_activation_policy(tauri::ActivationPolicy::Accessory)
        .map_err(|error| error.to_string())?;
    panel.order_front_regardless();

    Ok(())
}

pub fn show(app: &AppHandle, overlay: &tauri::WebviewWindow) -> Result<(), String> {
    let app_for_task = app.clone();
    let overlay = overlay.clone();

    run_on_main_thread(app, move || {
        if let Ok(panel) = app_for_task.get_webview_panel(OVERLAY_LABEL) {
            panel.order_front_regardless();
            Ok(())
        } else {
            overlay.show().map_err(|error| error.to_string())
        }
    })
}

pub fn close(app: &AppHandle) -> Result<(), String> {
    let app_for_task = app.clone();

    run_on_main_thread(app, move || {
        if let Ok(panel) = app_for_task.get_webview_panel(OVERLAY_LABEL) {
            if let Some(window) = panel.to_window() {
                window.close().map_err(|error| error.to_string())?;
            }
        } else if let Some(window) = app_for_task.get_webview_window(OVERLAY_LABEL) {
            window.close().map_err(|error| error.to_string())?;
        }

        app_for_task
            .set_activation_policy(tauri::ActivationPolicy::Regular)
            .map_err(|error| error.to_string())
    })
}

fn run_on_main_thread<T, F>(app: &AppHandle, task: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    let (sender, receiver) = std::sync::mpsc::sync_channel(1);

    app.run_on_main_thread(move || {
        let _ = sender.send(task());
    })
    .map_err(|error| error.to_string())?;

    receiver
        .recv()
        .map_err(|_| "macOS main-thread window task was cancelled".to_string())?
}
