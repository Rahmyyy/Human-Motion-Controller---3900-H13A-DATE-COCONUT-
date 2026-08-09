use std::sync::{Mutex, MutexGuard};

use serde::Serialize;
use tauri::{
    AppHandle, Emitter, LogicalPosition, Manager, Runtime, WebviewUrl, WebviewWindowBuilder,
};

#[cfg(target_os = "macos")]
#[path = "overlay/macos.rs"]
mod platform;

#[cfg(not(target_os = "macos"))]
#[path = "overlay/standard.rs"]
mod platform;

pub(crate) use platform::OverlayRuntime;

use crate::native::contract::SessionSummaryDto;

/// Serialises overlay creation. These commands are `async`, so two invokes
/// arriving together (React strict mode remounts the session page) would
/// otherwise both see "no overlay yet" and race to build one, and the loser
/// fails on the duplicate window label.
static OPEN_LOCK: Mutex<()> = Mutex::new(());

const OVERLAY_LABEL: &str = "overlay";
const MAIN_LABEL: &str = "main";

/// Logical size of the overlay. Deliberately small: the window is not
/// click-through, so every pixel it covers is a pixel the game underneath
/// cannot receive clicks on.
const OVERLAY_WIDTH: f64 = 340.0;
const OVERLAY_HEIGHT: f64 = 560.0;
const SCREEN_MARGIN: f64 = 24.0;

/// Opens the always-on-top session overlay, or re-focuses it if it already
/// exists. Idempotent so a double invoke (React strict mode, an impatient
/// double click) cannot spawn two overlays.
///
/// Must stay `async`: a synchronous command runs on the main thread, and
/// building a webview window there deadlocks WebView2 on Windows — the window
/// appears but never paints, and the event loop stops servicing anything else.
#[tauri::command]
pub async fn open_overlay<R: Runtime + platform::OverlayRuntime>(
    app: AppHandle<R>,
    patient_id: String,
    preset_id: String,
    session_id: String,
) -> Result<(), String> {
    // Held for the whole command; there is no await inside, so it is never
    // held across a suspension point.
    let _guard = lock_open(&OPEN_LOCK)?;

    if let Some(existing) = app.get_webview_window(OVERLAY_LABEL) {
        // Deliberately no set_focus: key presses are synthesised with enigo,
        // which delivers them to whichever window holds keyboard focus. An
        // overlay that takes focus would eat every keystroke meant for the game.
        platform::show(&app, &existing)?;
        return Ok(());
    }

    // HashRouter, so the route travels in the fragment of the shared entrypoint.
    let url = overlay_url(&patient_id, &preset_id, &session_id);

    let overlay = WebviewWindowBuilder::new(&app, OVERLAY_LABEL, WebviewUrl::App(url.into()))
        .title("Human Controller Overlay")
        .inner_size(OVERLAY_WIDTH, OVERLAY_HEIGHT)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .visible(platform::SHOW_ON_BUILD)
        .skip_taskbar(true)
        .resizable(false)
        .shadow(false)
        // Never steal focus from the game the user is about to play.
        .focused(false)
        .build()
        .map_err(|e| e.to_string())?;

    // The app-wide menu is attached to every window on Windows and Linux, which
    // would otherwise put a menu bar across the top of an undecorated overlay.
    let _ = overlay.remove_menu();

    position_top_right(&overlay);

    platform::configure(&overlay)?;

    Ok(())
}

/// Ends the session: tears the overlay down, then tells the main window so it
/// can leave the session screen. Both End Session buttons route through here so
/// the two windows can never disagree about whether a session is running.
///
/// The overlay is the only window that owns live session state (see
/// `SessionOverlayWindow`'s doc comment), so it is always the caller here,
/// carrying the final stats to hand to the main window.
///
/// `async` for the same reason as [`open_overlay`]: window lifecycle work does
/// not belong on the main thread.
#[tauri::command]
pub async fn close_overlay<R: Runtime + platform::OverlayRuntime>(
    app: AppHandle<R>,
    session_id: String,
    summary: SessionSummaryDto,
) -> Result<(), String> {
    platform::close(&app)?;

    if let Some(main) = app.get_webview_window(MAIN_LABEL) {
        main.emit(
            "session-ended",
            &SessionEndedEvent {
                session_id: &session_id,
                summary: &summary,
            },
        )
        .map_err(|e| e.to_string())?;
        main.set_focus().map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SessionEndedEvent<'a> {
    session_id: &'a str,
    summary: &'a SessionSummaryDto,
}

/// Ties the overlay's lifetime to the main window. The overlay is hidden from
/// the taskbar, so without this a user who closes the main window mid-session
/// would leave the app running with no visible way to quit it.
pub fn close_with_main_window<R: Runtime>(app: &AppHandle<R>) {
    let Some(main) = app.get_webview_window(MAIN_LABEL) else {
        return;
    };

    let handle = app.clone();
    main.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
            close_overlay_window(&handle);
        }
    });
}

fn lock_open(lock: &Mutex<()>) -> Result<MutexGuard<'_, ()>, String> {
    lock.lock().map_err(|error| error.to_string())
}

fn overlay_url(patient_id: &str, preset_id: &str, session_id: &str) -> String {
    format!("index.html#/patients/{patient_id}/presets/{preset_id}/overlay?sessionId={session_id}")
}

fn close_overlay_window<R: Runtime>(app: &AppHandle<R>) -> bool {
    if let Some(overlay) = app.get_webview_window(OVERLAY_LABEL) {
        let _ = overlay.close();
        true
    } else {
        false
    }
}

/// Parks the overlay in the top-right corner of whichever monitor it opened on.
/// Positioning is best effort — a failure here leaves a usable overlay in the
/// default spot, so it must not fail the session.
fn position_top_right<R: Runtime>(overlay: &tauri::WebviewWindow<R>) {
    let Ok(Some(monitor)) = overlay.current_monitor() else {
        return;
    };

    let scale = monitor.scale_factor();
    let screen = monitor.size().to_logical::<f64>(scale);
    let origin = monitor.position().to_logical::<f64>(scale);

    let position = top_right_position(origin, screen);

    if let Err(error) = overlay.set_position(position) {
        log::warn!("Failed to position overlay window: {error}");
    }
}

fn top_right_position(
    origin: LogicalPosition<f64>,
    screen: tauri::LogicalSize<f64>,
) -> LogicalPosition<f64> {
    LogicalPosition::new(
        origin.x + screen.width - OVERLAY_WIDTH - SCREEN_MARGIN,
        origin.y + SCREEN_MARGIN,
    )
}

#[cfg(test)]
mod tests;
