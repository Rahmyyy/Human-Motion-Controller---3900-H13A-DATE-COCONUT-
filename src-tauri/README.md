# Structure

- `lib.rs` initialises following
  1. Logging plugin
  2. Starts the `sender_thread` + `mediapipe_thread` + `webcam_thread`
  3. Builds to top-bar menu

Currently the backend runs with 3 threads:

1. `webcam_thread` which fetches frames from the camera and send them to
2. `mediapipe_thread` which takes frame from `webcam_thread` and runs the mediapipe pose estimation on them returning the pose landmarks
3. `sender_thread` which accepts frames from `webcam_thread` and `mediapipe_thread` and send them to the front-end

## src/mediapipe

- `runner.rs` contains the `mediapipe_thread` and will all functions from following files as needed
- `landmark.rs` contains the types output by the pose detector:
  1. Enum `Landmarks` is the index/ names of each point that we can detect
  2. Struct `LandmarkPoint` contains where one of these points are and how confident that it is visible
  3. Struct `PoseLandmarks` is just a hash map with keys of type `Landmark` pointing to each `LandmarkPoint`

- `landmarker.rs` and `detector.rs` contain the actual functions to run the mediapipe model
- `preprocessing.rs` contains code to reshape the input image for the landmarker model such that the image is scaled + centred correctly on the person
- `annotate.rs` takes the camera's frame + model's output (`LandmarkPose`) and draws on the frame as a visual aid

## src/streams

- `camera.rs` uses the crate nokhwa to fetch frames from the camera
- `sender.rs` sends frames produced in the backend to the frontend

# Logging

> Docs: https://v2.tauri.app/plugin/logging/

In code just import macros as needed `log::{debug, info, warn, error};`

Should find log files saved:

- Windows: `~\AppData\Local\com.chriswang.human-controller\logs`
- macOS: `~/Library/Logs/com.chriswang.human-controller`
