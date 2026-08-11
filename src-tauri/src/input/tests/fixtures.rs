use std::collections::HashSet;

use enigo::{Button, Direction, Key};

use crate::input::action::InputBackend;

#[derive(Debug, Eq, PartialEq)]
pub(super) enum SentInput {
    Key(Key, Direction),
    Button(Button, Direction),
}

#[derive(Default)]
pub(super) struct FakeBackend {
    pub held_keys: HashSet<Key>,
    pub sent: Vec<SentInput>,
    pub failure: Option<String>,
}

impl FakeBackend {
    fn result(&mut self) -> Result<(), String> {
        match self.failure.take() {
            Some(error) => Err(error),
            None => Ok(()),
        }
    }
}

impl InputBackend for FakeBackend {
    fn key_is_pressed(&mut self, key: Key) -> bool {
        self.held_keys.contains(&key)
    }

    fn send_key(&mut self, key: Key, direction: Direction) -> Result<(), String> {
        self.sent.push(SentInput::Key(key, direction));
        self.result()
    }

    fn send_button(&mut self, button: Button, direction: Direction) -> Result<(), String> {
        self.sent.push(SentInput::Button(button, direction));
        self.result()
    }
}
