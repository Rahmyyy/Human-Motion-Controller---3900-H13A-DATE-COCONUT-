use super::{conn_without_schema, count_patients};
use crate::patient::repository::{
    delete_patient, insert_patient, select_patient_by_id, select_patients, touch_patient_activity,
    update_patient,
};
use crate::test_support::setup_test_conn;

#[test]
fn insert_stores_every_column_and_counts_owned_presets() {
    let conn = setup_test_conn();

    insert_patient(
        &conn,
        "patient-2",
        "Bailey",
        Some("Weekly review"),
        "10",
        "needsReview",
        1_500,
    )
    .unwrap();

    let inserted = select_patient_by_id(&conn, "patient-2").unwrap();
    assert_eq!(inserted.display_name, "Bailey");
    assert_eq!(inserted.clinical_notes.as_deref(), Some("Weekly review"));
    assert_eq!(inserted.created_at, "10");
    assert_eq!(inserted.status, "needsReview");
    assert_eq!(inserted.last_activity_at_ms, 1_500);
    assert_eq!(inserted.preset_count, 0);

    // The seeded patient owns one preset, so the LEFT JOIN counts it.
    let seeded = select_patient_by_id(&conn, "patient-1").unwrap();
    assert_eq!(seeded.preset_count, 1);
    assert_eq!(seeded.clinical_notes, None);
}

#[test]
fn listing_orders_by_latest_activity_then_newest_creation() {
    let conn = setup_test_conn();
    insert_patient(&conn, "patient-2", "Bailey", None, "5", "active", 0).unwrap();
    insert_patient(&conn, "patient-3", "Casey", None, "1", "active", 9).unwrap();

    let ids: Vec<String> = select_patients(&conn)
        .unwrap()
        .into_iter()
        .map(|patient| patient.id)
        .collect();

    assert_eq!(ids, ["patient-3", "patient-2", "patient-1"]);
}

#[test]
fn selecting_a_missing_patient_is_an_error() {
    let conn = setup_test_conn();

    assert!(select_patient_by_id(&conn, "missing").is_err());
}

#[test]
fn update_and_delete_report_the_rows_they_touched() {
    let conn = setup_test_conn();

    assert_eq!(
        update_patient(&conn, "patient-1", "Renamed", Some("Notes"), "needsReview").unwrap(),
        1
    );
    assert_eq!(
        update_patient(&conn, "missing", "Renamed", None, "active").unwrap(),
        0
    );

    let updated = select_patient_by_id(&conn, "patient-1").unwrap();
    assert_eq!(updated.display_name, "Renamed");
    assert_eq!(updated.clinical_notes.as_deref(), Some("Notes"));
    assert_eq!(updated.status, "needsReview");

    assert_eq!(delete_patient(&conn, "missing").unwrap(), 0);
    assert_eq!(delete_patient(&conn, "patient-1").unwrap(), 1);
    assert_eq!(count_patients(&conn), 0);
}

#[test]
fn touching_activity_takes_the_later_timestamp_only() {
    let conn = setup_test_conn();

    assert_eq!(touch_patient_activity(&conn, "patient-1", 500).unwrap(), 1);
    assert_eq!(touch_patient_activity(&conn, "patient-1", 200).unwrap(), 1);
    assert_eq!(touch_patient_activity(&conn, "missing", 500).unwrap(), 0);

    assert_eq!(
        select_patient_by_id(&conn, "patient-1")
            .unwrap()
            .last_activity_at_ms,
        500
    );
}

#[test]
fn inserting_a_duplicate_id_propagates_the_sqlite_error() {
    let conn = setup_test_conn();

    // The primary key is already taken by the seeded patient.
    let error =
        insert_patient(&conn, "patient-1", "Duplicate", None, "0", "active", 0).unwrap_err();

    assert!(
        format!("{error:#}").contains("UNIQUE constraint failed"),
        "unexpected error: {error:#}"
    );
}

/// SQLite's TEXT affinity leaves a blob unconverted and its INTEGER affinity leaves a
/// non-numeric string unconverted, so writing either one corrupts a single column
/// without tripping a constraint. The row mappers have to surface that as an error
/// rather than panicking on the failed conversion.
#[test]
fn a_corrupted_column_is_reported_instead_of_panicking() {
    for (column, corrupt_value) in [
        ("id", "X'00'"),
        ("display_name", "X'00'"),
        ("clinical_notes", "X'00'"),
        ("created_at", "X'00'"),
        ("last_activity_at_ms", "'not-a-number'"),
    ] {
        let conn = setup_test_conn();
        // patient-2 owns no presets, so rewriting its id cannot break a foreign key.
        insert_patient(
            &conn,
            "patient-2",
            "Bailey",
            Some("Notes"),
            "0",
            "active",
            0,
        )
        .unwrap();
        conn.execute(
            &format!("UPDATE patients SET {column} = {corrupt_value} WHERE id = 'patient-2'"),
            [],
        )
        .unwrap();

        assert!(
            select_patients(&conn).is_err(),
            "listing tolerated a corrupted {column}"
        );
        assert!(
            select_patient_by_id(&conn, "patient-2").is_err(),
            "lookup tolerated a corrupted {column}"
        );
    }
}

#[test]
fn every_statement_propagates_a_missing_schema() {
    let conn = conn_without_schema();

    assert!(insert_patient(&conn, "patient-1", "Alex", None, "0", "active", 0).is_err());
    assert!(select_patients(&conn).is_err());
    assert!(select_patient_by_id(&conn, "patient-1").is_err());
    assert!(update_patient(&conn, "patient-1", "Alex", None, "active").is_err());
    assert!(touch_patient_activity(&conn, "patient-1", 0).is_err());
    assert!(delete_patient(&conn, "patient-1").is_err());
}
