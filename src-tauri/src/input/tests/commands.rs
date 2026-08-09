use crate::input::{execute_action, press_key, PressType};

/// Nothing in the test suite calls `init_action_backend` — doing so would build a real enigo
/// backend and start synthesising keystrokes on the developer's machine — so the global handler
/// is still unset here. That is exactly the state both commands have to refuse to work in.
#[test]
fn both_commands_refuse_to_run_without_an_initialised_backend() {
    assert_eq!(
        press_key("Space".to_string()),
        Err("Enigo backend uninitialised".to_string())
    );
    assert_eq!(
        execute_action("Space".to_string(), PressType::Press),
        Err("Enigo backend uninitialised".to_string())
    );
}

/// The backend is requested before the key is parsed, so an unknown key reports the missing
/// backend rather than the parse failure.
#[test]
fn the_backend_is_checked_before_the_key_is_parsed() {
    assert_eq!(
        press_key("Nonsense".to_string()),
        Err("Enigo backend uninitialised".to_string())
    );
    assert_eq!(
        execute_action("Nonsense".to_string(), PressType::Click),
        Err("Enigo backend uninitialised".to_string())
    );
}
