import { TRACKED_LANDMARKS, type TrackedLandmark } from "@/modules/pose-capture";

/**
 * Static humanoid layout for the landmark selector. Coordinates live in an abstract viewBox space
 * (not tied to any live pose). The diagram mirrors the person like the camera preview does: the
 * person's right-side landmarks (e.g. Right Wrist) sit on the viewer's right, so raising your right
 * arm lights up the dot on the same side you see yourself move.
 */
export interface LandmarkDiagramNode {
  index: TrackedLandmark;
  name: string;
  x: number;
  y: number;
}

export const LANDMARK_DIAGRAM_WIDTH = 100;
export const LANDMARK_DIAGRAM_HEIGHT = 150;

// x is mirrored (person's right on the viewer's right) so the diagram matches the mirrored camera.
export const LANDMARK_DIAGRAM_NODES: LandmarkDiagramNode[] = [
  { index: 12, name: "Right Shoulder", x: 62, y: 40 },
  { index: 11, name: "Left Shoulder", x: 38, y: 40 },
  { index: 14, name: "Right Elbow", x: 70, y: 58 },
  { index: 13, name: "Left Elbow", x: 30, y: 58 },
  { index: 16, name: "Right Wrist", x: 74, y: 76 },
  { index: 15, name: "Left Wrist", x: 26, y: 76 },
  { index: 24, name: "Right Hip", x: 57, y: 82 },
  { index: 23, name: "Left Hip", x: 43, y: 82 },
  { index: 26, name: "Right Knee", x: 59, y: 112 },
  { index: 25, name: "Left Knee", x: 41, y: 112 },
  { index: 28, name: "Right Ankle", x: 60, y: 142 },
  { index: 27, name: "Left Ankle", x: 40, y: 142 },
];

// Bones between tracked landmarks, used only to draw the reference skeleton.
export const LANDMARK_DIAGRAM_CONNECTIONS: Array<[TrackedLandmark, TrackedLandmark]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

// Safety net: keep the diagram in sync with the tracked-landmark set it is meant to cover.
if (LANDMARK_DIAGRAM_NODES.length !== TRACKED_LANDMARKS.length) {
  console.warn("Landmark diagram nodes are out of sync with TRACKED_LANDMARKS");
}
