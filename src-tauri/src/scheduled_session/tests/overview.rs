use super::*;

#[test]
fn overview_counts_active_patients_and_uses_half_open_day_bounds() {
    let conn = setup_test_conn();
    insert_patient(&conn, "patient-2", "Second", "needsReview");
    for (id, patient_id, scheduled_at_ms) in [
        ("before", TEST_PATIENT_ID, DAY_START_MS - 1),
        ("start", TEST_PATIENT_ID, DAY_START_MS),
        ("later", "patient-2", 1_500),
        ("end", TEST_PATIENT_ID, DAY_END_MS),
    ] {
        insert_scheduled_session(&conn, id, patient_id, scheduled_at_ms);
    }

    let overview = service::get_dashboard_overview(&conn, DAY_START_MS, DAY_END_MS).unwrap();

    assert_eq!(overview.active_patient_count, 1);
    assert_eq!(overview.sessions_today_count, 2);
    assert_eq!(
        overview
            .todays_schedule
            .iter()
            .map(|session| session.id.as_str())
            .collect::<Vec<_>>(),
        vec!["start", "later"]
    );
    assert_eq!(overview.todays_schedule[1].patient_display_name, "Second");
}

#[test]
fn overview_orders_timestamp_ties_by_id() {
    let conn = setup_test_conn();
    insert_scheduled_session(&conn, "session-b", TEST_PATIENT_ID, 1_500);
    insert_scheduled_session(&conn, "session-a", TEST_PATIENT_ID, 1_500);

    let overview = service::get_dashboard_overview(&conn, DAY_START_MS, DAY_END_MS).unwrap();

    let ids = overview
        .todays_schedule
        .iter()
        .map(|session| session.id.as_str())
        .collect::<Vec<_>>();
    assert_eq!(ids, vec!["session-a", "session-b"]);
}

#[test]
fn overview_can_return_an_empty_schedule() {
    let conn = setup_test_conn();

    let overview = service::get_dashboard_overview(&conn, DAY_START_MS, DAY_END_MS).unwrap();

    assert_eq!(overview.active_patient_count, 1);
    assert_eq!(overview.sessions_today_count, 0);
    assert!(overview.todays_schedule.is_empty());
}
