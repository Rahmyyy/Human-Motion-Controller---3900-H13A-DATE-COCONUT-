use enigo::Direction;

use crate::input::PressType;

/// `to_direction` is given the key's current held state, so `Toggle` is the only variant whose
/// result depends on it. The other three must ignore it entirely.
#[test]
fn toggle_follows_the_current_key_state() {
    assert_eq!(PressType::Toggle.to_direction(false), Direction::Press);
    assert_eq!(PressType::Toggle.to_direction(true), Direction::Release);
}

#[test]
fn the_other_press_types_ignore_the_current_key_state() {
    for held in [false, true] {
        assert_eq!(PressType::Press.to_direction(held), Direction::Press);
        assert_eq!(PressType::Release.to_direction(held), Direction::Release);
        assert_eq!(PressType::Click.to_direction(held), Direction::Click);
    }
}

/// The frontend sends these as bare JSON strings, so the variant names are part of the IPC
/// contract and cannot be renamed without breaking the caller.
#[test]
fn press_types_round_trip_through_their_wire_names() {
    for (variant, wire) in [
        (PressType::Toggle, "\"Toggle\""),
        (PressType::Press, "\"Press\""),
        (PressType::Release, "\"Release\""),
        (PressType::Click, "\"Click\""),
    ] {
        assert_eq!(serde_json::to_string(&variant).unwrap(), wire);
        assert_eq!(
            serde_json::from_str::<PressType>(wire).unwrap(),
            variant,
            "{wire}"
        );
    }
}

#[test]
fn an_unknown_press_type_is_rejected() {
    assert!(serde_json::from_str::<PressType>("\"Hold\"").is_err());
}
