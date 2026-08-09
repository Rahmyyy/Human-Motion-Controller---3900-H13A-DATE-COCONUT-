use tauri::{AppHandle, Manager as _, Runtime, WebviewWindow};
use tauri_nspanel::{
    objc2_app_kit::{NSWindowCollectionBehavior, NSWindowStyleMask},
    tauri_panel, ManagerExt as _, WebviewWindowExt as _,
};

use super::OVERLAY_LABEL;

pub const SHOW_ON_BUILD: bool = false;

pub trait OverlayRuntime: Runtime {
    fn configure_overlay(overlay: &WebviewWindow<Self>) -> Result<(), String>;
    fn show_overlay(app: &AppHandle<Self>, overlay: &WebviewWindow<Self>) -> Result<(), String>;
    fn close_overlay(app: &AppHandle<Self>) -> Result<(), String>;
}

tauri_panel! {
    panel!(SessionOverlayPanel {
        config: {
            can_become_key_window: false,
            can_become_main_window: false,
            is_floating_panel: true
        }
    })
}

impl OverlayRuntime for tauri::Wry {
    fn configure_overlay(overlay: &WebviewWindow<Self>) -> Result<(), String> {
        configure_wry(overlay)
    }

    fn show_overlay(app: &AppHandle<Self>, overlay: &WebviewWindow<Self>) -> Result<(), String> {
        show_wry(app, overlay)
    }

    fn close_overlay(app: &AppHandle<Self>) -> Result<(), String> {
        close_wry(app)
    }
}

#[cfg(test)]
impl OverlayRuntime for tauri::test::MockRuntime {
    fn configure_overlay(_: &WebviewWindow<Self>) -> Result<(), String> {
        Ok(())
    }

    fn show_overlay(_: &AppHandle<Self>, overlay: &WebviewWindow<Self>) -> Result<(), String> {
        overlay.show().map_err(|error| error.to_string())
    }

    fn close_overlay(app: &AppHandle<Self>) -> Result<(), String> {
        if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
            window.close().map_err(|error| error.to_string())?;
        }
        Ok(())
    }
}

pub fn configure<R: OverlayRuntime>(overlay: &WebviewWindow<R>) -> Result<(), String> {
    R::configure_overlay(overlay)
}

pub fn show<R: OverlayRuntime>(
    app: &AppHandle<R>,
    overlay: &WebviewWindow<R>,
) -> Result<(), String> {
    R::show_overlay(app, overlay)
}

pub fn close<R: OverlayRuntime>(app: &AppHandle<R>) -> Result<(), String> {
    R::close_overlay(app)
}

/// Fullscreen windows live in separate Spaces on macOS. Configure the overlay
/// as a non-activating auxiliary panel before AppKit first shows it.
fn configure_wry(overlay: &WebviewWindow) -> Result<(), String> {
    let app = overlay.app_handle().clone();
    let overlay = overlay.clone();

    run_on_main_thread(&app, move || configure_on_main_thread(&overlay))
}

fn configure_on_main_thread(overlay: &WebviewWindow) -> Result<(), String> {
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

fn show_wry(app: &AppHandle, overlay: &WebviewWindow) -> Result<(), String> {
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

fn close_wry(app: &AppHandle) -> Result<(), String> {
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
