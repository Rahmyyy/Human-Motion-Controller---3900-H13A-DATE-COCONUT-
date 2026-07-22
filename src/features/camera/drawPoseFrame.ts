import { PoseLandmarker } from "@mediapipe/tasks-vision";
import type { PoseFrame, PoseLandmark } from "./poseFrame";

const MIN_VISIBILITY = 0.5;

export function drawPoseFrame(
  canvas: HTMLCanvasElement,
  frame: PoseFrame,
  dimensions?: { width: number; height: number },
) {
  if (dimensions && canvas.width !== dimensions.width) canvas.width = dimensions.width;
  if (dimensions && canvas.height !== dimensions.height) canvas.height = dimensions.height;

  const context = canvas.getContext("2d");
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  const landmarks = new Map(frame.landmarks.map((landmark) => [landmark.index, landmark]));

  for (const connection of PoseLandmarker.POSE_CONNECTIONS) {
    const start = landmarks.get(connection.start);
    const end = landmarks.get(connection.end);
    if (!isVisible(start) || !isVisible(end)) continue;

    context.beginPath();
    context.moveTo(start.x * canvas.width, start.y * canvas.height);
    context.lineTo(end.x * canvas.width, end.y * canvas.height);
    context.lineWidth = 4;
    context.strokeStyle = "rgba(34, 197, 94, 0.9)";
    context.stroke();
  }

  for (const landmark of frame.landmarks) {
    if (!isVisible(landmark)) continue;

    context.beginPath();
    context.arc(landmark.x * canvas.width, landmark.y * canvas.height, 5, 0, Math.PI * 2);
    context.fillStyle = "rgba(14, 165, 233, 0.95)";
    context.fill();
  }
}

function isVisible(landmark: PoseLandmark | undefined): landmark is PoseLandmark {
  return Boolean(landmark && landmark.visibility >= MIN_VISIBILITY);
}
