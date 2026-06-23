const DEFAULT_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
  audio: false,
};

export function openCamera(
  constraints: MediaStreamConstraints = DEFAULT_CAMERA_CONSTRAINTS,
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access is not supported in this environment.");
  }

  return navigator.mediaDevices.getUserMedia(constraints);
}

export function closeCamera(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}
