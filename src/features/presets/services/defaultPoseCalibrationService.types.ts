import type { PoseFrame } from "@/features/camera/poseFrame";
import type { RecordingQuality } from "@/features/movement-mapping/recording/analyseRecordingQuality";
import type { RecordingTrimRange } from "@/features/movement-mapping/recording/trimRecording";
import type { RecordingState } from "@/features/movement-mapping/services/recordingService.types";

export type DefaultPoseCalibrationStatus =
  | "idle"
  | "loading"
  | "ready"
  | "saving"
  | "saved"
  | "error";

export interface DefaultPoseCalibrationSnapshot {
  canSave: boolean;
  countdownSeconds: number | null;
  error: string | null;
  presetId: string | null;
  recordedFrames: PoseFrame[];
  recordingQuality: RecordingQuality | null;
  recordingState: RecordingState;
  recordingTrim: RecordingTrimRange | null;
  status: DefaultPoseCalibrationStatus;
}

/** Owns default-pose loading, recording, quality analysis, and persistence. */
export interface DefaultPoseCalibrationService {
  getSnapshot(): DefaultPoseCalibrationSnapshot;
  subscribe(listener: () => void): () => void;
  start(patientId: string | undefined, presetId: string | undefined): Promise<void>;
  dispose(): void;
  startRecording(): void;
  cancelCountdown(): void;
  stopRecording(): void;
  resetRecording(): void;
  trimRecording(range: RecordingTrimRange): void;
  save(): Promise<void>;
}
