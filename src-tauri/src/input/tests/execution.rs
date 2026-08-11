use enigo::{Button, Direction, Key};

use super::fixtures::{FakeBackend, SentInput};
use crate::input::{execute_with, PressType};

#[test]
fn keyboard_actions_are_sent_with_the_requested_direction() {
    for (press_type, expected) in [
        (PressType::Press, Direction::Press),
        (PressType::Release, Direction::Release),
        (PressType::Click, Direction::Click),
    ] {
        let mut backend = FakeBackend::default();

        execute_with(&mut backend, "Space", press_type).unwrap();

        assert_eq!(backend.sent, [SentInput::Key(Key::Space, expected)]);
    }
}

#[test]
fn keyboard_toggle_uses_the_current_held_state() {
    let mut released = FakeBackend::default();
    execute_with(&mut released, "Space", PressType::Toggle).unwrap();
    assert_eq!(
        released.sent,
        [SentInput::Key(Key::Space, Direction::Press)]
    );

    let mut held = FakeBackend::default();
    held.held_keys.insert(Key::Space);
    execute_with(&mut held, "Space", PressType::Toggle).unwrap();
    assert_eq!(held.sent, [SentInput::Key(Key::Space, Direction::Release)]);
}

#[test]
fn mouse_actions_are_sent_with_the_requested_direction() {
    for (press_type, expected) in [
        (PressType::Press, Direction::Press),
        (PressType::Release, Direction::Release),
        (PressType::Click, Direction::Click),
    ] {
        let mut backend = FakeBackend::default();

        execute_with(&mut backend, "MouseLeft", press_type).unwrap();

        assert_eq!(backend.sent, [SentInput::Button(Button::Left, expected)]);
    }
}

#[test]
fn mouse_toggle_is_rejected_without_sending_input() {
    let mut backend = FakeBackend::default();

    assert_eq!(
        execute_with(&mut backend, "MouseLeft", PressType::Toggle),
        Err("Toggle mouse button not available".to_string())
    );
    assert!(backend.sent.is_empty());
}

#[test]
fn native_keyboard_and_mouse_failures_are_returned_to_the_caller() {
    for key in ["Space", "MouseLeft"] {
        let mut backend = FakeBackend {
            failure: Some("native injection failed".to_string()),
            ..Default::default()
        };

        assert_eq!(
            execute_with(&mut backend, key, PressType::Click),
            Err("native injection failed".to_string()),
            "{key}"
        );
    }
}

#[test]
fn invalid_keys_are_rejected_before_input_is_sent() {
    let mut backend = FakeBackend::default();

    assert_eq!(
        execute_with(&mut backend, "Nonsense", PressType::Click),
        Err("Unknown key: Nonsense".to_string())
    );
    assert!(backend.sent.is_empty());
}
