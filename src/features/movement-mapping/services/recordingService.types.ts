import type { PoseFrame } from "@/features/camera/poseFrame";
import type { RecordingTrimRange } from "../recording/trimRecording";

export type RecordingState = "idle" | "countdown" | "recording" | "recorded";

export interface RecordingSnapshot {
  countdownSeconds: number | null;
  isRecording: boolean;
  recordedFrames: PoseFrame[];
  recordingTrim: RecordingTrimRange | null;
  recordingState: RecordingState;
}

/**
 * Owns one recording workspace, including its countdown, private frame
 * buffer, recording state, trimming, and reset behavior.
 */
export interface RecordingService {
  getSnapshot(): RecordingSnapshot;
  subscribe(listener: () => void): () => void;
  start(): void;
  stop(): void;
  startRecording(): void;
  cancelCountdown(): void;
  stopRecording(): PoseFrame[];
  resetRecording(): void;
  trimRecording(range: RecordingTrimRange): void;
}
