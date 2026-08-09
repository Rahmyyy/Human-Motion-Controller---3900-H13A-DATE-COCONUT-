use rusqlite::Connection;

use super::*;

#[test]
fn create_trims_fields_persists_the_preset_and_touches_activity() {
    let conn = setup_test_conn();

    let created = service::create_preset(&conn, " patient-1 ", "  Upper Limb Rehab  ").unwrap();
    let saved = service::get_preset(&conn, &created.id, TEST_PATIENT_ID).unwrap();

    assert!(created.id.starts_with("preset-"));
    assert_eq!(created.name, "Upper Limb Rehab");
    assert_eq!(created.mapping_count, 0);
    assert_eq!(created.default_pose_frames_json, None);
    assert_eq!(saved.id, created.id);
    assert!(patient_activity(&conn) > 0);
}

#[test]
fn create_rejects_an_unknown_patient_without_writing_a_preset() {
    let conn = setup_test_conn();

    assert!(service::create_preset(&conn, "missing", "Rehab").is_err());

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM presets", [], |row| row.get(0))
        .unwrap();
    assert_eq!(count, 1);
}

#[test]
fn create_propagates_insert_and_activity_update_failures() {
    let missing_schema = Connection::open_in_memory().unwrap();
    assert!(service::create_preset(&missing_schema, TEST_PATIENT_ID, "Rehab").is_err());

    let missing_activity_column = Connection::open_in_memory().unwrap();
    missing_activity_column
        .execute_batch(
            "CREATE TABLE patients (id TEXT PRIMARY KEY);
             INSERT INTO patients VALUES ('patient-1');
             CREATE TABLE presets (
                id TEXT PRIMARY KEY, patient_id TEXT, name TEXT, created_at TEXT,
                default_pose_frames_json TEXT
             );",
        )
        .unwrap();
    assert!(service::create_preset(&missing_activity_column, TEST_PATIENT_ID, "Rehab").is_err());
}
