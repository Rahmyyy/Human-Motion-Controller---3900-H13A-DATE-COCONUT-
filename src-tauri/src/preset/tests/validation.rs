use super::*;

#[test]
fn create_validates_patient_name_and_character_count() {
    let conn = setup_test_conn();

    for (patient_id, name, message) in [
        ("   ", "Rehab", "Patient ID cannot be empty"),
        (TEST_PATIENT_ID, "   ", "Preset name cannot be empty"),
    ] {
        let error = service::create_preset(&conn, patient_id, name).unwrap_err();
        assert_eq!(error.to_string(), message);
    }
    let error = service::create_preset(&conn, TEST_PATIENT_ID, &"🙂".repeat(61)).unwrap_err();
    assert_eq!(error.to_string(), "Preset name cannot exceed 60 characters");
}

#[test]
fn reads_reject_empty_identifiers() {
    let conn = setup_test_conn();

    assert_eq!(
        service::get_presets(&conn, " ").unwrap_err().to_string(),
        "Patient ID cannot be empty"
    );
    assert_eq!(
        service::get_preset(&conn, " ", TEST_PATIENT_ID)
            .unwrap_err()
            .to_string(),
        "Preset ID cannot be empty"
    );
    assert_eq!(
        service::get_preset(&conn, TEST_PRESET_ID, " ")
            .unwrap_err()
            .to_string(),
        "Patient ID cannot be empty"
    );
}

#[test]
fn mutations_reject_empty_identifiers() {
    let mut conn = setup_test_conn();

    assert_eq!(
        service::duplicate_preset(&mut conn, " ")
            .unwrap_err()
            .to_string(),
        "Preset ID cannot be empty"
    );
    assert_eq!(
        service::delete_preset(&conn, " ").unwrap_err().to_string(),
        "Preset ID cannot be empty"
    );
    assert_eq!(
        service::update_default_pose(&conn, " ", TEST_PATIENT_ID, VALID_FRAMES)
            .unwrap_err()
            .to_string(),
        "Preset ID cannot be empty"
    );
    assert_eq!(
        service::update_default_pose(&conn, TEST_PRESET_ID, " ", VALID_FRAMES)
            .unwrap_err()
            .to_string(),
        "Patient ID cannot be empty"
    );
}
