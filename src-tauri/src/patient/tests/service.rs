use super::count_patients;
use crate::patient::repository;
use crate::patient::service::{
    create_patient, delete_patient, get_patient, get_patients, touch_patient_activity,
    update_patient,
};
use crate::test_support::setup_test_conn;

#[test]
fn create_and_update_patient_status() {
    let conn = setup_test_conn();
    let created = create_patient(&conn, "  Alex J.  ", Some("  Rehab  "), "needsReview").unwrap();

    assert_eq!(created.display_name, "Alex J.");
    assert_eq!(created.clinical_notes.as_deref(), Some("Rehab"));
    assert_eq!(created.status, "needsReview");
    assert!(created.last_activity_at_ms > 0);
    assert!(created.id.starts_with("patient-"));
    assert_eq!(created.preset_count, 0);

    let updated = update_patient(&conn, &created.id, "Alex J.", None, "active").unwrap();
    assert_eq!(updated.status, "active");
    assert_eq!(updated.clinical_notes, None);
    assert_eq!(updated.last_activity_at_ms, created.last_activity_at_ms);
}

#[test]
fn blank_clinical_notes_are_stored_as_absent() {
    let conn = setup_test_conn();

    let created = create_patient(&conn, "Alex", Some("   "), "active").unwrap();

    assert_eq!(created.clinical_notes, None);
}

#[test]
fn get_patient_returns_the_requested_row_only() {
    let conn = setup_test_conn();
    create_patient(&conn, "Bailey", None, "active").unwrap();

    let patient = get_patient(&conn, "patient-1").unwrap();

    assert_eq!(patient.display_name, "Test Patient");
    assert_eq!(patient.preset_count, 1);
}

#[test]
fn touching_activity_only_moves_timestamp_forward() {
    let conn = setup_test_conn();
    repository::touch_patient_activity(&conn, "patient-1", 500).unwrap();
    repository::touch_patient_activity(&conn, "patient-1", 200).unwrap();

    assert_eq!(
        get_patient(&conn, "patient-1").unwrap().last_activity_at_ms,
        500
    );
}

#[test]
fn touching_activity_stamps_the_current_time() {
    let conn = setup_test_conn();

    touch_patient_activity(&conn, "patient-1").unwrap();

    assert!(get_patient(&conn, "patient-1").unwrap().last_activity_at_ms > 0);
}

#[test]
fn patients_are_ordered_by_latest_activity() {
    let conn = setup_test_conn();
    let second = create_patient(&conn, "Second", None, "active").unwrap();
    repository::touch_patient_activity(&conn, "patient-1", second.last_activity_at_ms + 1).unwrap();

    let patients = get_patients(&conn).unwrap();

    assert_eq!(patients.len(), 2);
    assert_eq!(patients[0].id, "patient-1");
}

#[test]
fn deleting_a_patient_removes_it_from_the_listing() {
    let conn = setup_test_conn();

    delete_patient(&conn, "patient-1").unwrap();

    assert_eq!(count_patients(&conn), 0);
    assert!(get_patients(&conn).unwrap().is_empty());
    assert!(get_patient(&conn, "patient-1").is_err());
}
