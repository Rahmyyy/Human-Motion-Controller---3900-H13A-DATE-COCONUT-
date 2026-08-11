use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

use enigo::Settings;

use crate::input::backend::{create_with_retry, request_backend, store_backend, StoreResult};

#[test]
fn requesting_an_uninitialised_backend_has_a_stable_error() {
    let handler = OnceLock::<Mutex<i32>>::new();

    assert_eq!(
        request_backend(&handler).unwrap_err(),
        "Enigo backend uninitialised"
    );
}

#[test]
fn a_backend_can_be_initialised_requested_and_reinitialised() {
    let handler = OnceLock::new();

    assert_eq!(
        store_backend(&handler, 1).unwrap(),
        StoreResult::Initialized
    );
    assert_eq!(*request_backend(&handler).unwrap(), 1);
    assert_eq!(
        store_backend(&handler, 2).unwrap(),
        StoreResult::Reinitialized
    );
    assert_eq!(*request_backend(&handler).unwrap(), 2);
}

#[test]
fn requesting_or_replacing_a_poisoned_backend_reports_the_lock_failure() {
    let handler = Arc::new(OnceLock::new());
    handler.set(Mutex::new(1)).unwrap();
    let handler_for_thread = Arc::clone(&handler);
    let _ = std::thread::spawn(move || {
        let _guard = handler_for_thread.get().unwrap().lock().unwrap();
        panic!("poison the backend lock");
    })
    .join();

    assert!(request_backend(&handler).is_err());
    assert!(store_backend(&handler, 2).is_err());
}

#[test]
fn initialisation_retries_without_reopening_the_permission_prompt() {
    let mut attempts = Vec::new();
    let mut waits = Vec::new();

    let backend = create_with_retry(
        Settings::default(),
        |settings| {
            attempts.push(settings.open_prompt_to_get_permissions);
            if attempts.len() < 3 {
                Err("not ready")
            } else {
                Ok("backend")
            }
        },
        |duration| waits.push(duration),
    );

    assert_eq!(backend, "backend");
    assert_eq!(attempts, [true, false, false]);
    assert_eq!(waits, [Duration::from_secs(1), Duration::from_secs(1)]);
}
