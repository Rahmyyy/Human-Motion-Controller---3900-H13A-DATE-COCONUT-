use super::conn_without_schema;
use crate::patient::service::{
    create_patient, delete_patient, get_patient, get_patients, touch_patient_activity,
    update_patient,
};
use crate::test_support::setup_test_conn;

const MAX_DISPLAY_NAME_LENGTH: usize = 60;
const MAX_CLINICAL_NOTES_LENGTH: usize = 500;

#[test]
fn blank_display_names_are_rejected() {
    let conn = setup_test_conn();

    assert_eq!(
        create_patient(&conn, "   ", None, "active")
            .unwrap_err()
            .to_string(),
        "Patient display name cannot be empty"
    );
    assert_eq!(
        update_patient(&conn, "patient-1", "", None, "active")
            .unwrap_err()
            .to_string(),
        "Patient display name cannot be empty"
    );
}

#[test]
fn display_names_are_capped_at_the_documented_length() {
    let conn = setup_test_conn();
    let at_limit = "a".repeat(MAX_DISPLAY_NAME_LENGTH);
    let over_limit = "a".repeat(MAX_DISPLAY_NAME_LENGTH + 1);

    assert!(create_patient(&conn, &at_limit, None, "active").is_ok());
    assert_eq!(
        create_patient(&conn, &over_limit, None, "active")
            .unwrap_err()
            .to_string(),
        "Patient display name cannot exceed 60 characters"
    );
}

#[test]
fn clinical_notes_are_capped_at_the_documented_length() {
    let conn = setup_test_conn();
    let at_limit = "n".repeat(MAX_CLINICAL_NOTES_LENGTH);
    let over_limit = "n".repeat(MAX_CLINICAL_NOTES_LENGTH + 1);

    assert!(create_patient(&conn, "Alex", Some(&at_limit), "active").is_ok());
    assert_eq!(
        create_patient(&conn, "Alex", Some(&over_limit), "active")
            .unwrap_err()
            .to_string(),
        "Clinical notes cannot exceed 500 characters"
    );
}

#[test]
fn invalid_patient_status_is_rejected() {
    let conn = setup_test_conn();

    let error = create_patient(&conn, "Alex", None, "archived").unwrap_err();

    assert_eq!(
        error.to_string(),
        "Patient status must be active or needsReview"
    );
    assert_eq!(
        update_patient(&conn, "patient-1", "Alex", None, "")
            .unwrap_err()
            .to_string(),
        "Patient status must be active or needsReview"
    );
}

#[test]
fn every_id_taking_operation_rejects_a_blank_id() {
    let conn = setup_test_conn();

    for error in [
        get_patient(&conn, "").unwrap_err(),
        update_patient(&conn, "  ", "Alex", None, "active").unwrap_err(),
        touch_patient_activity(&conn, "").unwrap_err(),
        delete_patient(&conn, "   ").unwrap_err(),
    ] {
        assert_eq!(error.to_string(), "Patient ID cannot be empty");
    }
}

#[test]
fn operations_on_an_unknown_patient_report_it_as_missing() {
    let conn = setup_test_conn();

    for error in [
        update_patient(&conn, "missing", "Alex", None, "active").unwrap_err(),
        touch_patient_activity(&conn, "missing").unwrap_err(),
        delete_patient(&conn, "missing").unwrap_err(),
    ] {
        assert_eq!(error.to_string(), "Patient not found");
    }

    // Reading a missing patient surfaces the SQLite error instead of this message.
    assert!(get_patient(&conn, "missing").is_err());
}

#[test]
fn database_failures_are_propagated_rather_than_swallowed() {
    let conn = conn_without_schema();

    assert!(create_patient(&conn, "Alex", None, "active").is_err());
    assert!(get_patients(&conn).is_err());
    assert!(get_patient(&conn, "patient-1").is_err());
    assert!(update_patient(&conn, "patient-1", "Alex", None, "active").is_err());
    assert!(touch_patient_activity(&conn, "patient-1").is_err());
    assert!(delete_patient(&conn, "patient-1").is_err());
}
