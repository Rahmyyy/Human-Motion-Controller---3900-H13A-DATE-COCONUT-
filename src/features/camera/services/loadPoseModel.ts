import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

const WASM_ASSET_PATH = "/mediapipe/wasm";
const POSE_MODEL_PATH = "/mediapipe/models/pose_landmarker_lite.task";

export async function loadPoseModel() {
  const vision = await FilesetResolver.forVisionTasks(WASM_ASSET_PATH);

  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: POSE_MODEL_PATH,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputSegmentationMasks: false,
  });
}
