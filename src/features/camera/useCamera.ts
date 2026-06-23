import { useCallback, useEffect, useRef, useState } from "react";
import { closeCamera, openCamera } from "./cameraService";

export type CameraStatus = "idle" | "starting" | "active" | "error";

function getCameraErrorMessage(cause: unknown): string {
  if (!(cause instanceof DOMException)) {
    return cause instanceof Error ? cause.message : "Unable to access the camera.";
  }

  switch (cause.name) {
    case "NotAllowedError":
      return "Camera access was denied. Enable camera permission and try again.";
    case "NotFoundError":
      return "No camera was found. Connect a camera and try again.";
    case "NotReadableError":
      return "The camera is unavailable or being used by another application.";
    default:
      return cause.message || "Unable to access the camera.";
  }
}

export function useCamera() {
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      closeCamera(streamRef.current);
      streamRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    releaseStream();
    setStream(null);
    setError(null);
    setStatus("idle");
  }, [releaseStream]);

  const start = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    releaseStream();
    setStream(null);
    setError(null);
    setStatus("starting");

    try {
      const nextStream = await openCamera();

      if (requestIdRef.current !== requestId) {
        closeCamera(nextStream);
        return;
      }

      streamRef.current = nextStream;
      setStream(nextStream);
      setStatus("active");
    } catch (cause) {
      if (requestIdRef.current !== requestId) return;

      setError(getCameraErrorMessage(cause));
      setStatus("error");
    }
  }, [releaseStream]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      releaseStream();
    };
  }, [releaseStream]);

  return { stream, status, error, start, stop };
}
