import { useCallback, useRef, useState } from "react";
import type { PoseFrame } from "@/features/camera/poseFrame";

export type RecordingState = "idle" | "recording" | "recorded";

export function usePoseRecording() {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordedFrames, setRecordedFrames] = useState<PoseFrame[]>([]);
  const isRecordingRef = useRef(false);
  const framesRef = useRef<PoseFrame[]>([]);

  const startRecording = useCallback(() => {
    framesRef.current = [];
    setRecordedFrames([]);
    isRecordingRef.current = true;
    setRecordingState("recording");
  }, []);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setRecordedFrames(framesRef.current);
    setRecordingState("recorded");
    return framesRef.current;
  }, []);

  const recordFrame = useCallback((frame: PoseFrame) => {
    if (isRecordingRef.current) {
      framesRef.current.push(frame);
    }
  }, []);

  const resetRecording = useCallback(() => {
    framesRef.current = [];
    setRecordedFrames([]);
    isRecordingRef.current = false;
    setRecordingState("idle");
  }, []);

  return {
    isRecording: recordingState === "recording",
    recordedFrames,
    recordingState,
    recordFrame,
    resetRecording,
    startRecording,
    stopRecording,
  };
}
