mod backend;
mod commands;
mod execution;
mod fixtures;
mod keys;
mod press_type;

use enigo::{Button, Key};

use super::{Action, PressType};

fn keyboard(key: Key) -> Result<Action, String> {
    Ok(Action::Keyboard(key, PressType::Click))
}

fn mouse(button: Button) -> Result<Action, String> {
    Ok(Action::MouseButton(button, PressType::Click))
}

fn parse(key_str: &str) -> Result<Action, String> {
    Action::from_raw_str(key_str, PressType::Click)
}
