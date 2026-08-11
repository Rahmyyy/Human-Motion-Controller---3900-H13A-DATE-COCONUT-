use tauri::Manager;

use super::{broken_state, poisoned_state, seeded_state, test_app};
use crate::patient::commands::{
    create_patient, delete_patient, get_patient, get_patients, touch_patient_activity,
    update_patient,
};

#[test]
fn a_patient_can_be_created_read_updated_and_deleted_through_the_commands() {
    let app = test_app(seeded_state());

    let created = create_patient(
        app.state(),
        "Bailey".to_string(),
        Some("Weekly review".to_string()),
        "needsReview".to_string(),
    )
    .unwrap();
    assert_eq!(created.display_name, "Bailey");
    assert_eq!(created.clinical_notes.as_deref(), Some("Weekly review"));
    assert_eq!(created.status, "needsReview");

    assert_eq!(get_patients(app.state()).unwrap().len(), 2);
    assert_eq!(
        get_patient(app.state(), created.id.clone()).unwrap(),
        created
    );

    let updated = update_patient(
        app.state(),
        created.id.clone(),
        "Bailey R.".to_string(),
        None,
        "active".to_string(),
    )
    .unwrap();
    assert_eq!(updated.display_name, "Bailey R.");
    assert_eq!(updated.clinical_notes, None);
    assert_eq!(updated.status, "active");

    touch_patient_activity(app.state(), created.id.clone()).unwrap();
    let touched = get_patient(app.state(), created.id.clone()).unwrap();
    assert!(touched.last_activity_at_ms >= updated.last_activity_at_ms);

    delete_patient(app.state(), created.id).unwrap();
    assert_eq!(get_patients(app.state()).unwrap().len(), 1);
}

#[test]
fn service_failures_are_mapped_to_stable_error_codes() {
    let app = test_app(seeded_state());

    let create_error = create_patient(
        app.state(),
        "Bailey".to_string(),
        None,
        "archived".to_string(),
    )
    .unwrap_err();
    assert_eq!(create_error.code, "patient_create_failed");
    assert_eq!(
        create_error.message,
        "Patient status must be active or needsReview"
    );

    assert_eq!(
        get_patient(app.state(), "missing".to_string())
            .unwrap_err()
            .code,
        "patient_get_failed"
    );
    assert_eq!(
        update_patient(
            app.state(),
            "missing".to_string(),
            "Bailey".to_string(),
            None,
            "active".to_string(),
        )
        .unwrap_err()
        .code,
        "patient_update_failed"
    );
    assert_eq!(
        touch_patient_activity(app.state(), "missing".to_string())
            .unwrap_err()
            .code,
        "patient_activity_update_failed"
    );
    assert_eq!(
        delete_patient(app.state(), "missing".to_string())
            .unwrap_err()
            .code,
        "patient_delete_failed"
    );
}

#[test]
fn listing_reports_a_database_failure() {
    let app = test_app(broken_state());

    let error = get_patients(app.state()).unwrap_err();

    assert_eq!(error.code, "patient_list_failed");
    assert!(
        error.message.contains("no such table"),
        "unexpected message: {}",
        error.message
    );
}

#[test]
fn a_poisoned_connection_lock_fails_every_command() {
    let app = test_app(poisoned_state());
    let id = "patient-1".to_string();

    let codes = [
        create_patient(
            app.state(),
            "Bailey".to_string(),
            None,
            "active".to_string(),
        )
        .unwrap_err()
        .code,
        get_patients(app.state()).unwrap_err().code,
        get_patient(app.state(), id.clone()).unwrap_err().code,
        update_patient(
            app.state(),
            id.clone(),
            "Bailey".to_string(),
            None,
            "active".to_string(),
        )
        .unwrap_err()
        .code,
        touch_patient_activity(app.state(), id.clone())
            .unwrap_err()
            .code,
        delete_patient(app.state(), id).unwrap_err().code,
    ];

    for code in codes {
        assert_eq!(code, "database_lock_failed");
    }
}
