use std::sync::{Arc, Mutex};

use tauri::{LogicalPosition, LogicalSize};

use super::{open, overlay_window, test_app};
use crate::overlay::{close_overlay_window, lock_open, overlay_url, top_right_position};

#[test]
fn the_overlay_route_is_built_from_all_three_identifiers() {
    assert_eq!(
        overlay_url("patient-a", "preset-b", "session-c"),
        "index.html#/patients/patient-a/presets/preset-b/overlay?sessionId=session-c"
    );
}

#[test]
fn a_poisoned_open_lock_is_reported_as_an_error() {
    let lock = Arc::new(Mutex::new(()));
    let lock_for_thread = Arc::clone(&lock);
    let _ = std::thread::spawn(move || {
        let _guard = lock_for_thread.lock().unwrap();
        panic!("poison the test lock");
    })
    .join();

    assert!(lock_open(&lock).is_err());
}

#[test]
fn top_right_position_respects_monitor_origin_size_and_margin() {
    let position = top_right_position(
        LogicalPosition::new(-1920.0, 100.0),
        LogicalSize::new(1920.0, 1080.0),
    );

    assert_eq!(position, LogicalPosition::new(-364.0, 124.0));
}

#[test]
fn the_close_hook_action_closes_an_existing_overlay() {
    let app = test_app();
    open(&app).unwrap();
    assert!(overlay_window(&app).is_some());

    assert!(close_overlay_window(app.handle()));
}

#[test]
fn the_close_hook_action_is_a_no_op_without_an_overlay() {
    let app = test_app();

    assert!(!close_overlay_window(app.handle()));
}

#[cfg(target_os = "macos")]
mod macos {
    use std::sync::mpsc;

    use crate::overlay::platform::receive_main_thread_result;

    #[test]
    fn main_thread_results_preserve_success_and_task_errors() {
        let (success_sender, success_receiver) = mpsc::channel();
        success_sender.send(Ok::<_, String>(42)).unwrap();
        assert_eq!(receive_main_thread_result(success_receiver), Ok(42));

        let (error_sender, error_receiver) = mpsc::channel();
        error_sender
            .send(Err::<(), _>("task failed".into()))
            .unwrap();
        assert_eq!(
            receive_main_thread_result(error_receiver),
            Err("task failed".into())
        );
    }

    #[test]
    fn a_cancelled_main_thread_task_has_a_stable_error() {
        let (sender, receiver) = mpsc::channel::<Result<(), String>>();
        drop(sender);

        assert_eq!(
            receive_main_thread_result(receiver),
            Err("macOS main-thread window task was cancelled".into())
        );
    }
}
