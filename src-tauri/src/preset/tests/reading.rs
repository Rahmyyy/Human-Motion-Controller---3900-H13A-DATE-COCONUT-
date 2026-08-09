use super::*;

#[test]
fn list_orders_presets_and_returns_real_mapping_counts() {
    let conn = setup_test_conn();
    preset_repository::insert_preset(&conn, "preset-2", TEST_PATIENT_ID, "Second", "2").unwrap();
    insert_mapping(&conn, "mapping-1", "preset-2");

    let presets = service::get_presets(&conn, " patient-1 ").unwrap();

    assert_eq!(presets.len(), 2);
    assert_eq!(presets[0].id, "preset-2");
    assert_eq!(presets[0].mapping_count, 1);
    assert_eq!(presets[1].id, TEST_PRESET_ID);
    assert_eq!(presets[1].mapping_count, 0);
}

#[test]
fn list_returns_empty_for_a_patient_without_presets() {
    let conn = setup_test_conn();

    let presets = service::get_presets(&conn, "missing").unwrap();

    assert!(presets.is_empty());
}

#[test]
fn get_trims_identifiers_and_scopes_the_preset_to_its_patient() {
    let conn = setup_test_conn();

    let preset = service::get_preset(&conn, " preset-1 ", " patient-1 ").unwrap();

    assert_eq!(preset.id, TEST_PRESET_ID);
    assert!(service::get_preset(&conn, TEST_PRESET_ID, "other-patient").is_err());
    assert!(service::get_preset(&conn, "missing", TEST_PATIENT_ID).is_err());
}
