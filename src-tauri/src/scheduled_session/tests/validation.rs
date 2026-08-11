use super::*;

#[test]
fn create_rejects_empty_and_whitespace_patient_ids() {
    let conn = setup_test_conn();

    for patient_id in ["", "   "] {
        let error = service::create_scheduled_session(&conn, patient_id, i64::MAX).unwrap_err();
        assert_eq!(error.to_string(), "Patient ID cannot be empty");
    }
}

#[test]
fn create_rejects_a_missing_patient() {
    let conn = setup_test_conn();

    let error = service::create_scheduled_session(&conn, "missing", i64::MAX).unwrap_err();

    assert_eq!(error.to_string(), "Patient not found");
}

#[test]
fn create_rejects_a_time_that_is_not_in_the_future() {
    let conn = setup_test_conn();

    let error = service::create_scheduled_session(&conn, TEST_PATIENT_ID, 0).unwrap_err();

    assert_eq!(error.to_string(), "Scheduled session must be in the future");
}

#[test]
fn overview_rejects_equal_and_reversed_day_bounds() {
    let conn = setup_test_conn();

    for (start, end) in [(DAY_START_MS, DAY_START_MS), (DAY_END_MS, DAY_START_MS)] {
        let error = service::get_dashboard_overview(&conn, start, end).unwrap_err();
        assert_eq!(error.to_string(), "Day end must be after day start");
    }
}
