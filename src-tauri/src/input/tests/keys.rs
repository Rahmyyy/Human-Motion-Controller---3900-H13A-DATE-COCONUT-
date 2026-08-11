use enigo::{Button, Key};

use super::{keyboard, mouse, parse};
use crate::input::{Action, PressType};

#[test]
fn maps_an_uppercase_letter_to_the_unshifted_key() {
    // Regression: an uppercase char makes enigo produce a virtual key with
    // the shift state still in the high byte, which maps to no scan code
    // and silently sends a keypress no application can receive.
    assert_eq!(parse("L"), keyboard(Key::Unicode('l')));
}

#[test]
fn leaves_already_lowercase_and_digit_keys_alone() {
    assert_eq!(parse("w"), keyboard(Key::Unicode('w')));
    assert_eq!(parse("4"), keyboard(Key::Unicode('4')));
}

/// Any single character is taken literally, so a one-character string never reaches the named-key
/// table below — including characters that happen to spell nothing.
#[test]
fn every_single_character_is_treated_as_a_literal_key() {
    for (input, expected) in [(".", '.'), (" ", ' '), ("é", 'é'), ("ß", 'ß')] {
        assert_eq!(parse(input), keyboard(Key::Unicode(expected)), "{input:?}");
    }
}

#[test]
fn maps_named_keys_and_their_aliases() {
    for (aliases, expected) in [
        (["Enter", "Return"], Key::Return),
        (["Space", "Spacebar"], Key::Space),
        (["Escape", "Esc"], Key::Escape),
        (["ArrowUp", "Arrow Up"], Key::UpArrow),
        (["ArrowDown", "Arrow Down"], Key::DownArrow),
        (["ArrowLeft", "Arrow Left"], Key::LeftArrow),
        (["ArrowRight", "Arrow Right"], Key::RightArrow),
    ] {
        for alias in aliases {
            assert_eq!(parse(alias), keyboard(expected), "{alias}");
        }
    }

    assert_eq!(parse("Tab"), keyboard(Key::Tab));
    assert_eq!(parse("Backspace"), keyboard(Key::Backspace));
}

/// Anything the table above misses falls through to enigo's own `Key` names, which is how the
/// function modifier and navigation keys are reached without listing them here.
#[test]
fn falls_back_to_enigos_key_names() {
    for (name, expected) in [
        ("F1", Key::F1),
        ("Shift", Key::Shift),
        ("Control", Key::Control),
        ("Alt", Key::Alt),
        ("Meta", Key::Meta),
        ("CapsLock", Key::CapsLock),
        ("PageUp", Key::PageUp),
        ("Delete", Key::Delete),
        ("Home", Key::Home),
    ] {
        assert_eq!(parse(name), keyboard(expected), "{name}");
    }
}

#[test]
fn maps_named_mouse_buttons_and_their_aliases() {
    for (aliases, expected) in [
        (["MouseLeft", "Mouse Left"], Button::Left),
        (["MouseRight", "Mouse Right"], Button::Right),
        (["MouseMiddle", "Mouse Middle"], Button::Middle),
    ] {
        for alias in aliases {
            assert_eq!(parse(alias), mouse(expected), "{alias}");
        }
    }
}

/// Mouse buttons the aliases above do not name fall through to enigo's own `Button` names, which
/// are tried only after every keyboard route has failed.
#[test]
fn falls_back_to_enigos_button_names() {
    for (name, expected) in [
        ("Back", Button::Back),
        ("Forward", Button::Forward),
        ("ScrollUp", Button::ScrollUp),
        ("ScrollDown", Button::ScrollDown),
    ] {
        assert_eq!(parse(name), mouse(expected), "{name}");
    }
}

#[test]
fn rejects_input_that_names_neither_a_key_nor_a_button() {
    for input in ["Nonsense", "", "Mouse Sideways", "arrowup"] {
        assert_eq!(
            parse(input),
            Err(format!("Unknown key: {input}")),
            "{input:?}"
        );
    }
}

#[test]
fn the_press_type_is_carried_through_to_the_action() {
    for press_type in [
        PressType::Toggle,
        PressType::Press,
        PressType::Release,
        PressType::Click,
    ] {
        assert_eq!(
            Action::from_raw_str("Space", press_type.clone()),
            Ok(Action::Keyboard(Key::Space, press_type.clone()))
        );
        assert_eq!(
            Action::from_raw_str("MouseLeft", press_type.clone()),
            Ok(Action::MouseButton(Button::Left, press_type))
        );
    }
}
