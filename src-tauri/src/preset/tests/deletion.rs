use super::*;

#[test]
fn delete_removes_the_preset_and_cascades_to_its_mappings() {
    let conn = setup_test_conn();
    insert_mapping(&conn, "mapping-1", TEST_PRESET_ID);

    service::delete_preset(&conn, TEST_PRESET_ID).unwrap();

    let preset_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM presets", [], |row| row.get(0))
        .unwrap();
    let mapping_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM movement_mappings", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert_eq!(preset_count, 0);
    assert_eq!(mapping_count, 0);
}

#[test]
fn delete_rejects_a_missing_preset_and_propagates_database_errors() {
    let conn = setup_test_conn();
    assert_eq!(
        service::delete_preset(&conn, "missing")
            .unwrap_err()
            .to_string(),
        "Preset not found"
    );

    let missing_schema = rusqlite::Connection::open_in_memory().unwrap();
    assert!(service::delete_preset(&missing_schema, TEST_PRESET_ID).is_err());
}
