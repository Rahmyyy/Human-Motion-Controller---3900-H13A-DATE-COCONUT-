import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseFrame } from "@/features/camera/poseFrame";

// Stores recorded PoseFrame data without re-rendering on every camera frame.
// React state is updated only when the recording state changes.
export type RecordingState = "idle" | "countdown" | "recording" | "recorded";

const COUNTDOWN_SECONDS = 3;

export function usePoseRecording(
  initialFrames: PoseFrame[] = [],
  initialRecordingState: RecordingState = "idle",
) {
  const [recordingState, setRecordingState] = useState<RecordingState>(initialRecordingState);
  const [recordedFrames, setRecordedFrames] = useState<PoseFrame[]>(initialFrames);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const isRecordingRef = useRef(false);
  const framesRef = useRef<PoseFrame[]>(initialFrames);

  const startRecording = useCallback(() => {
    isRecordingRef.current = false;
    setCountdownSeconds(COUNTDOWN_SECONDS);
    setRecordingState("countdown");
  }, []);

  useEffect(() => {
    if (recordingState !== "countdown") return;

    const startedAt = performance.now();
    const intervalId = window.setInterval(() => {
      const elapsedSeconds = (performance.now() - startedAt) / 1000;
      const remainingSeconds = Math.ceil(COUNTDOWN_SECONDS - elapsedSeconds);

      if (remainingSeconds > 0) {
        setCountdownSeconds(remainingSeconds);
        return;
      }

      framesRef.current = [];
      setRecordedFrames([]);
      isRecordingRef.current = true;
      setCountdownSeconds(null);
      setRecordingState("recording");
    }, 50);

    return () => window.clearInterval(intervalId);
  }, [recordingState]);

  const cancelCountdown = useCallback(() => {
    setCountdownSeconds(null);
    setRecordingState("idle");
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
    setCountdownSeconds(null);
    setRecordingState("idle");
  }, []);

  return {
    countdownSeconds,
    isRecording: recordingState === "recording",
    recordedFrames,
    recordingState,
    cancelCountdown,
    recordFrame,
    resetRecording,
    startRecording,
    stopRecording,
  };
}
