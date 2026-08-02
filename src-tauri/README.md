# Structure

The Tauri backend owns native application features such as SQLite persistence,
keyboard input, window management, and command handlers. Camera capture and
MediaPipe pose estimation run in the React frontend.

# Logging

> Docs: https://v2.tauri.app/plugin/logging/

In code just import macros as needed `log::{debug, info, warn, error};`

Should find log files saved:

- Windows: `~\AppData\Local\com.chriswang.human-controller\logs`
- macOS: `~/Library/Logs/com.chriswang.human-controller`
