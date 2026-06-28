import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type PoseLandmark = {
  index: number;
  x: number;
  y: number;
  z: number;
  visibility: number;
};

export type PoseFrame = {
  timestampMs: number;
  landmarks: PoseLandmark[];
};

export function toPoseFrame(timestampMs: number, landmarks: NormalizedLandmark[]): PoseFrame {
  return {
    timestampMs,
    landmarks: landmarks.map((landmark, index) => ({
      index,
      x: landmark.x,
      y: landmark.y,
      z: landmark.z,
      visibility: landmark.visibility,
    })),
  };
}
