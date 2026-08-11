use std::sync::Mutex;

use rusqlite::{params, Connection};
use tauri::{test::MockRuntime, App, Manager};

use crate::db::DbState;

pub(super) const TEST_PATIENT_ID: &str = "patient-1";
pub(super) const TEST_PRESET_ID: &str = "preset-1";
pub(super) const VALID_FRAMES: &str = r#"[{"timestampMs":0},{"timestampMs":33}]"#;

pub(super) fn insert_mapping(conn: &Connection, id: &str, preset_id: &str) {
    conn.execute(
        "INSERT INTO movement_mappings (
            id, preset_id, name, keybind, keypress_type, pose_frames_json,
            selected_landmarks_json, threshold_percentage,
            keypress_trigger_threshold_percentage, created_at
         ) VALUES (?1, ?2, 'Squat', 'S', 'Click', '[[1,2,3]]',
                   '[11,12]', 60, 75, '1')",
        params![id, preset_id],
    )
    .unwrap();
}

pub(super) fn patient_activity(conn: &Connection) -> i64 {
    conn.query_row(
        "SELECT last_activity_at_ms FROM patients WHERE id = ?1",
        [TEST_PATIENT_ID],
        |row| row.get(0),
    )
    .unwrap()
}

pub(super) fn stored_default_pose(conn: &Connection, preset_id: &str) -> Option<String> {
    conn.query_row(
        "SELECT default_pose_frames_json FROM presets WHERE id = ?1",
        [preset_id],
        |row| row.get(0),
    )
    .unwrap()
}

pub(super) fn mock_app_with(conn: Connection) -> App<MockRuntime> {
    let app = tauri::test::mock_app();
    assert!(app.manage(DbState {
        conn: Mutex::new(conn),
    }));
    app
}
