export type CameraMode = "frontend" | "backend";

const CAMERA_MODE_KEY = "human-controller.cameraMode";

export function getCameraMode(): CameraMode {
  if (typeof window === "undefined") return "frontend";

  return window.localStorage.getItem(CAMERA_MODE_KEY) === "backend" ? "backend" : "frontend";
}

export function setCameraMode(mode: CameraMode) {
  window.localStorage.setItem(CAMERA_MODE_KEY, mode);
}
