# Human Controller

Webcam-based motion mapping software for accessible rehabilitation gaming.

## Goal

This project maps therapeutic body movements detected through a webcam to keyboard inputs, allowing
patients to control existing PC games during rehabilitation exercises.

## Tech Stack

- Frontend: React + TypeScript
- Desktop wrapper: Tauri
- Pose Tracking: MediaPipe
- Local storage: SQLite
- Target platforms: Windows + MacOS

## Development Workflow

- `main` contains stable, tested demo ready code.
- Feature branches should be linked to Jira Tickets - `feature/H13ADATE-51-Tauri-Setup`

See [INSTALLATION.md](INSTALLATION.md) for Docker verification and native development setup.

See [FEATURE_IMPLEMENTATION_GUIDE.md](FEATURE_IMPLEMENTATION_GUIDE.md) for the general pattern used
to add features across the React, Tauri, Rust, and SQLite layers.

## Testing Approach

Our automated checks run formatting, linting, compilation and tests for both the React frontend and Rust backend. See [INSTALLATION.md](INSTALLATION.md) for Docker and native testing commands.

### Backend database

Backend tests use the same database schema initialiser as the application.

Repository and business logic tests use isolated in-memory SQLite databases, while startup tests use temporary directories so they do not affect a developer's local application data.

The database tests cover:

- successful and repeated database initialisation
- indexes and foreign keys
- database constraints
- cascade behaviour
- database and filesystem failures
- incompatible existing database schemas

SQLite is not mocked because the real database behaviour is important to verify.

### Tauri startup

Tauri startup tests use Tauri's `MockRuntime`.

They cover:

- database setup and application state
- startup ordering
- database and menu setup failures
- Tauri builder and plugin setup
- successful and failed IPC command calls

Keyboard and menu functionality are replaced with test fakes where needed so automated tests do not send real keyboard input or modify the native application menu.

The binary `main.rs` is intentionally only a launcher that delegates to `human_controller_lib::run()`; it has no application logic of its own. The meaningful startup and command-registration behaviour is tested through `lib.rs` with Tauri's `MockRuntime`. Calling the binary entrypoint in a unit test would start the real native event loop, so `main.rs` is treated as a manual smoke-test entrypoint rather than a unit-test target.

### Session overlay

The overlay tests use Tauri's `MockRuntime` to test most of the overlay behaviour without opening real native windows.

They cover:

- opening, closing, and reopening the overlay
- making sure opening or closing it twice does not cause problems
- sending the final session summary back to the main window
- handling missing windows and invalid requests
- checking overlay positioning
- handling failures during overlay tasks

Some parts of the overlay depend directly on macOS and cannot be tested properly using Tauri's `MockRuntime`. This includes creating the real overlay window, detecting monitors,
keeping the overlay above full-screen applications, and making sure it does not take keyboard focus.

These parts are tested manually instead.

Manual overlay test cases:

1. Start a session and check that one transparent overlay appears in the top-right of the active monitor without taking keyboard focus.
2. Open a game in macOS full-screen mode and check that the overlay stays visible and can still be clicked.
3. Try opening the overlay twice and check that only one overlay appears. End the session and check that the main window receives the session summary.
4. Close the main window during a session and check that the overlay also closes. Restart the app and check that the overlay can open normally again.

### Native input

The input tests use a fake in-memory input system so automated tests do not send real keyboard or mouse inputs.

They cover:

- recognising keyboard and mouse inputs
- handling valid and invalid key names
- pressing, releasing, clicking, and toggling held keys
- handling unsupported inputs
- handling keyboard or mouse input failures
- setting up and retrying the input system

The real Enigo input system is not used in automated tests because it would send actual keyboard and mouse inputs to whichever application is currently active. Operating system permissions also need to be tested on a real desktop.

Manual native-input test cases:

1. Give the application input permissions, open a text editor, and check that configured keyboard inputs work.
2. Test separate press and release actions and check that the key stays held between them.
3. Test a toggle action and check that each trigger switches the key between pressed and released.
4. Test left, right, and middle mouse clicks and check that each works correctly.
5. Deny input permission, restart the application, and check that it retries correctly without repeatedly showing the permission prompt.

Some behaviours cannot be reliably tested through the automated test suite, including:

- the real Tauri event loop
- native macOS menu behaviour
- NSPanel behaviour
- webcam permissions
- real keyboard injection

These behaviours are instead tested manually by running the application natively and following documented test cases.

### Running backend tests

```bash
cd src-tauri
cargo test
cargo llvm-cov
```
