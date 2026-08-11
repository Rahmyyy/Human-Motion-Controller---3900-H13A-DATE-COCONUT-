use rusqlite::Connection;

use super::*;

#[test]
fn every_repository_operation_reports_a_missing_schema() {
    let mut conn = Connection::open_in_memory().unwrap();

    assert!(
        preset_repository::insert_preset(&conn, "preset", TEST_PATIENT_ID, "Rehab", "0").is_err()
    );
    assert!(preset_repository::duplicate_preset_data(
        &mut conn,
        TEST_PRESET_ID,
        "duplicate",
        "Copy",
        "0",
        None,
        TEST_PATIENT_ID,
    )
    .is_err());
    assert!(preset_repository::select_presets_by_patient(&conn, TEST_PATIENT_ID).is_err());
    assert!(
        preset_repository::select_preset_by_id(&conn, TEST_PRESET_ID, TEST_PATIENT_ID).is_err()
    );
    assert!(preset_repository::select_preset_by_id_any_patient(&conn, TEST_PRESET_ID).is_err());
    assert!(preset_repository::delete_preset(&conn, TEST_PRESET_ID).is_err());
    assert!(preset_repository::update_default_pose_frames(
        &conn,
        TEST_PRESET_ID,
        TEST_PATIENT_ID,
        VALID_FRAMES
    )
    .is_err());
}

#[test]
fn malformed_preset_columns_are_reported_by_every_reader() {
    let conn = setup_test_conn();
    conn.execute_batch("UPDATE presets SET name = X'00' WHERE id = 'preset-1';")
        .unwrap();

    assert!(preset_repository::select_presets_by_patient(&conn, TEST_PATIENT_ID).is_err());
    assert!(
        preset_repository::select_preset_by_id(&conn, TEST_PRESET_ID, TEST_PATIENT_ID).is_err()
    );
    assert!(preset_repository::select_preset_by_id_any_patient(&conn, TEST_PRESET_ID).is_err());
}

#[test]
fn duplicate_rolls_back_when_copying_mappings_fails() {
    let mut conn = setup_test_conn();
    conn.execute_batch(
        "DROP TABLE movement_mappings;
         CREATE TABLE movement_mappings (id TEXT, preset_id TEXT);",
    )
    .unwrap();

    assert!(preset_repository::duplicate_preset_data(
        &mut conn,
        TEST_PRESET_ID,
        "duplicate",
        "Copy",
        "1",
        None,
        TEST_PATIENT_ID,
    )
    .is_err());

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM presets", [], |row| row.get(0))
        .unwrap();
    assert_eq!(count, 1);
}

#[test]
fn duplicate_reports_transaction_start_and_commit_failures() {
    let mut nested = setup_test_conn();
    nested.execute_batch("BEGIN").unwrap();
    assert!(preset_repository::duplicate_preset_data(
        &mut nested,
        TEST_PRESET_ID,
        "duplicate",
        "Copy",
        "1",
        None,
        TEST_PATIENT_ID,
    )
    .is_err());

    let mut deferred_foreign_key = setup_test_conn();
    deferred_foreign_key
        .execute_batch("PRAGMA defer_foreign_keys = ON")
        .unwrap();
    assert!(preset_repository::duplicate_preset_data(
        &mut deferred_foreign_key,
        TEST_PRESET_ID,
        "duplicate",
        "Copy",
        "1",
        None,
        "missing-patient",
    )
    .is_err());
    assert!(
        preset_repository::select_preset_by_id_any_patient(&deferred_foreign_key, "duplicate")
            .is_err()
    );
}
