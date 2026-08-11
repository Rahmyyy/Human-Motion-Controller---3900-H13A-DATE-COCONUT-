use std::panic::{catch_unwind, AssertUnwindSafe};

use rusqlite::Connection;
use tauri::Manager;

use super::*;
use crate::preset::commands;

#[test]
fn commands_support_the_complete_preset_lifecycle() {
    let app = mock_app_with(setup_test_conn());

    let created =
        commands::create_preset(app.state(), TEST_PATIENT_ID.into(), "Upper Limb".into()).unwrap();
    let listed = commands::get_presets(app.state(), TEST_PATIENT_ID.into()).unwrap();
    let fetched =
        commands::get_preset(app.state(), created.id.clone(), TEST_PATIENT_ID.into()).unwrap();
    let updated = commands::update_default_pose(
        app.state(),
        created.id.clone(),
        TEST_PATIENT_ID.into(),
        VALID_FRAMES.into(),
    )
    .unwrap();
    let duplicate = commands::duplicate_preset(app.state(), created.id.clone()).unwrap();
    commands::delete_preset(app.state(), created.id.clone()).unwrap();

    assert!(listed.iter().any(|preset| preset.id == created.id));
    assert_eq!(fetched.name, "Upper Limb");
    assert_eq!(
        updated.default_pose_frames_json.as_deref(),
        Some(VALID_FRAMES)
    );
    assert_eq!(duplicate.name, "Upper Limb (Copy)");
    assert!(commands::get_preset(app.state(), created.id, TEST_PATIENT_ID.into()).is_err());
}

#[test]
fn commands_attach_stable_codes_to_operation_errors() {
    let app = mock_app_with(Connection::open_in_memory().unwrap());

    let create =
        commands::create_preset(app.state(), "patient".into(), "Rehab".into()).unwrap_err();
    let list = commands::get_presets(app.state(), "patient".into()).unwrap_err();
    let get = commands::get_preset(app.state(), "preset".into(), "patient".into()).unwrap_err();
    let duplicate = commands::duplicate_preset(app.state(), "preset".into()).unwrap_err();
    let delete = commands::delete_preset(app.state(), "preset".into()).unwrap_err();
    let update = commands::update_default_pose(
        app.state(),
        "preset".into(),
        "patient".into(),
        VALID_FRAMES.into(),
    )
    .unwrap_err();

    assert_eq!(create.code, "preset_create_failed");
    assert_eq!(list.code, "preset_list_failed");
    assert_eq!(get.code, "preset_get_failed");
    assert_eq!(duplicate.code, "preset_duplicate_failed");
    assert_eq!(delete.code, "preset_delete_failed");
    assert_eq!(update.code, "preset_default_pose_update_failed");
}

#[test]
fn every_command_reports_a_poisoned_database_lock() {
    let app = mock_app_with(setup_test_conn());
    let state = app.state::<crate::db::DbState>();
    let _ = catch_unwind(AssertUnwindSafe(|| {
        let _guard = state.conn.lock().unwrap();
        panic!("poison test database lock");
    }));

    let create = commands::create_preset(app.state(), TEST_PATIENT_ID.into(), "Rehab".into());
    let list = commands::get_presets(app.state(), TEST_PATIENT_ID.into());
    let get = commands::get_preset(app.state(), TEST_PRESET_ID.into(), TEST_PATIENT_ID.into());
    let duplicate = commands::duplicate_preset(app.state(), TEST_PRESET_ID.into());
    let delete = commands::delete_preset(app.state(), TEST_PRESET_ID.into());
    let update = commands::update_default_pose(
        app.state(),
        TEST_PRESET_ID.into(),
        TEST_PATIENT_ID.into(),
        VALID_FRAMES.into(),
    );

    for error in [
        create.unwrap_err(),
        list.unwrap_err(),
        get.unwrap_err(),
        duplicate.unwrap_err(),
        delete.unwrap_err(),
        update.unwrap_err(),
    ] {
        assert_eq!(error.code, "database_lock_failed");
    }
}
