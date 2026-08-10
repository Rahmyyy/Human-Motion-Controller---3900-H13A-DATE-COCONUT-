use std::sync::{Arc, Mutex, OnceLock};

use crate::input::backend::{request_backend, store_backend, StoreResult};

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
