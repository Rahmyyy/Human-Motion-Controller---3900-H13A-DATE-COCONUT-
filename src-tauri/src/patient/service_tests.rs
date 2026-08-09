use super::*;
use crate::test_support::setup_test_conn;

#[test]
fn create_and_update_patient_status() {
    let conn = setup_test_conn();
    let created = create_patient(&conn, "  Alex J.  ", Some("  Rehab  "), "needsReview").unwrap();

    assert_eq!(created.display_name, "Alex J.");
    assert_eq!(created.clinical_notes.as_deref(), Some("Rehab"));
    assert_eq!(created.status, "needsReview");
    assert!(created.last_activity_at_ms > 0);

    let updated = update_patient(&conn, &created.id, "Alex J.", None, "active").unwrap();
    assert_eq!(updated.status, "active");
    assert_eq!(updated.last_activity_at_ms, created.last_activity_at_ms);
}

#[test]
fn invalid_patient_status_is_rejected() {
    let conn = setup_test_conn();

    let error = create_patient(&conn, "Alex", None, "archived").unwrap_err();

    assert_eq!(
        error.to_string(),
        "Patient status must be active or needsReview"
    );
}

#[test]
fn touching_activity_only_moves_timestamp_forward() {
    let conn = setup_test_conn();
    crate::patient::repository::touch_patient_activity(&conn, "patient-1", 500).unwrap();
    crate::patient::repository::touch_patient_activity(&conn, "patient-1", 200).unwrap();

    assert_eq!(
        get_patient(&conn, "patient-1").unwrap().last_activity_at_ms,
        500
    );
}

#[test]
fn patients_are_ordered_by_latest_activity() {
    let conn = setup_test_conn();
    let second = create_patient(&conn, "Second", None, "active").unwrap();
    crate::patient::repository::touch_patient_activity(
        &conn,
        "patient-1",
        second.last_activity_at_ms + 1,
    )
    .unwrap();

    let patients = get_patients(&conn).unwrap();

    assert_eq!(patients[0].id, "patient-1");
}
