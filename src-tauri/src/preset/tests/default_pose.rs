use super::*;

#[test]
fn update_default_pose_round_trips_valid_frames() {
    let conn = setup_test_conn();

    let updated =
        service::update_default_pose(&conn, " preset-1 ", " patient-1 ", VALID_FRAMES).unwrap();

    assert_eq!(
        updated.default_pose_frames_json.as_deref(),
        Some(VALID_FRAMES)
    );
    assert_eq!(
        stored_default_pose(&conn, TEST_PRESET_ID).as_deref(),
        Some(VALID_FRAMES)
    );
}

#[test]
fn update_rejects_invalid_non_array_and_insufficient_frames() {
    let conn = setup_test_conn();

    for (frames, message) in [
        ("not-json", "Default pose frames must be valid JSON"),
        ("{}", "Default pose frames must be a JSON array"),
        ("[]", "Default pose must contain at least two frames"),
        ("[{}]", "Default pose must contain at least two frames"),
    ] {
        let error = service::update_default_pose(&conn, TEST_PRESET_ID, TEST_PATIENT_ID, frames)
            .unwrap_err();
        assert_eq!(error.to_string(), message);
    }
}

#[test]
fn update_rejects_missing_or_wrong_patient_without_mutating_the_preset() {
    let conn = setup_test_conn();
    let original_pose = stored_default_pose(&conn, TEST_PRESET_ID);

    assert!(service::update_default_pose(&conn, "missing", TEST_PATIENT_ID, VALID_FRAMES).is_err());
    assert!(service::update_default_pose(&conn, TEST_PRESET_ID, "other", VALID_FRAMES).is_err());

    assert_eq!(stored_default_pose(&conn, TEST_PRESET_ID), original_pose);
}
