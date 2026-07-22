import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

const MEDIAPIPE_VERSION = "0.10.35";
const WASM_ASSET_PATH = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const POSE_MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/" +
  "pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

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
