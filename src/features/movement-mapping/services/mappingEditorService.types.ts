import type { PoseFrame } from "@/features/camera/poseFrame";
import type { PressType } from "@/features/movement-recognition/recognition/types";
import type { RecordingQuality } from "../recording/analyseRecordingQuality";
import type { RecordingTrimRange } from "../recording/trimRecording";
import type { RecordingState } from "./recordingService.types";

export interface Keybind {
  code: string;
  label: string;
}

export type MappingEditorStatus =
  | "idle"
  | "loading"
  | "ready"
  | "needs-calibration"
  | "saving"
  | "saved"
  | "error";

export interface MappingEditorSnapshot {
  canSave: boolean;
  countdownSeconds: number | null;
  error: string | null;
  keybind: Keybind | null;
  keypressType: PressType;
  keypressTriggerThresholdPercentage: number;
  movementName: string;
  recordedFrames: PoseFrame[];
  recordingQuality: RecordingQuality | null;
  recordingState: RecordingState;
  recordingTrim: RecordingTrimRange | null;
  selectedLandmarks: number[];
  status: MappingEditorStatus;
}

export interface MappingEditorInput {
  mappingId?: string;
  patientId?: string;
  presetId?: string;
}

/** Owns a create/edit mapping draft, recording, quality, validation, and persistence. */
export interface MappingEditorService {
  getSnapshot(): MappingEditorSnapshot;
  subscribe(listener: () => void): () => void;
  start(input: MappingEditorInput): Promise<void>;
  dispose(): void;
  setMovementName(name: string): void;
  setKeybind(keybind: Keybind): void;
  setKeypressType(keypressType: PressType): void;
  setKeypressTriggerThreshold(percentage: number): void;
  setSelectedLandmarks(landmarks: number[]): void;
  startRecording(): void;
  cancelCountdown(): void;
  stopRecording(): void;
  resetRecording(): void;
  trimRecording(range: RecordingTrimRange): void;
  save(): Promise<void>;
}
