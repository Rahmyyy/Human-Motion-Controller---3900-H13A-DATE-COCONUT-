use std::sync::{Mutex, MutexGuard, OnceLock};

use enigo::{Button, Direction, Enigo, Key, Keyboard, Mouse, Settings};
use log::{error, info};

use super::action::InputBackend;

static ENIGO_HANDLER: OnceLock<Mutex<Enigo>> = OnceLock::new();

impl InputBackend for Enigo {
    fn key_is_pressed(&mut self, key: Key) -> bool {
        self.held().0.contains(&key)
    }

    fn send_key(&mut self, key: Key, direction: Direction) -> Result<(), String> {
        Keyboard::key(self, key, direction).map_err(|error| error.to_string())
    }

    fn send_button(&mut self, button: Button, direction: Direction) -> Result<(), String> {
        Mouse::button(self, button, direction).map_err(|error| error.to_string())
    }
}

pub(super) fn request_enigo() -> Result<MutexGuard<'static, Enigo>, String> {
    request_backend(&ENIGO_HANDLER)
}

pub(super) fn init_action_backend() -> Result<(), ()> {
    let enigo = match Enigo::new(&Settings::default()) {
        Ok(x) => x,
        Err(e) => {
            error!("Failed to initialize enigo: {}", e);
            return Err(());
        }
    };

    match store_backend(&ENIGO_HANDLER, enigo).expect("Enigo backend lock was poisoned") {
        StoreResult::Initialized => info!("Initialised enigo backend"),
        StoreResult::Reinitialized => info!("Re-initialised enigo backend"),
    }

    Ok(())
}

pub(super) fn request_backend<T>(
    handler: &OnceLock<Mutex<T>>,
) -> Result<MutexGuard<'_, T>, String> {
    let mutex = handler.get().ok_or_else(|| {
        error!("Enigo backend uninitialised");
        "Enigo backend uninitialised".to_string()
    })?;

    mutex.lock().map_err(|error| error.to_string())
}

#[derive(Debug, Eq, PartialEq)]
pub(super) enum StoreResult {
    Initialized,
    Reinitialized,
}

pub(super) fn store_backend<T>(
    handler: &OnceLock<Mutex<T>>,
    backend: T,
) -> Result<StoreResult, String> {
    if let Some(mutex) = handler.get() {
        *mutex.lock().map_err(|error| error.to_string())? = backend;
        Ok(StoreResult::Reinitialized)
    } else {
        handler
            .set(Mutex::new(backend))
            .map_err(|_| "Input backend was initialised concurrently".to_string())?;
        Ok(StoreResult::Initialized)
    }
}
