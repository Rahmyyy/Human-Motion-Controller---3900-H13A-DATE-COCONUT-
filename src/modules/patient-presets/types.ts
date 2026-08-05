import type {
  PoseFrame,
  RecordingQuality,
  RecordingState,
  RecordingTrimRange,
} from "@/modules/pose-capture";

export interface Patient {
  id: string;
  displayName: string;
  clinicalNotes: string | null;
  createdAt: string;
  presetCount: number;
}

export interface Preset {
  id: string;
  patientId: string;
  name: string;
  createdAt: string;
  mappingCount: number;
  defaultPoseFramesJson: string | null;
}

export interface PresetMutationError {
  message: string;
  presetId: string;
}

export interface PresetSelectionSnapshot {
  createError: string | null;
  deleteError: PresetMutationError | null;
  deletingPresetId: string | null;
  duplicateError: PresetMutationError | null;
  duplicatingPresetId: string | null;
  error: string | null;
  isCreating: boolean;
  isLoading: boolean;
  presets: Preset[];
  selectedPreset: Preset | null;
  selectedPresetId: string | null;
}

export interface PresetSelectionService {
  getSnapshot(): PresetSelectionSnapshot;
  subscribe(listener: () => void): () => void;
  start(patientId: string | undefined): Promise<void>;
  dispose(): void;
  selectPreset(presetId: string): void;
  createPreset(name: string): Promise<Preset | null>;
  duplicatePreset(presetId: string): Promise<Preset | null>;
  deletePreset(presetId: string): Promise<boolean>;
  clearCreateError(): void;
  clearDuplicateError(): void;
  clearDeleteError(): void;
}

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

export interface DefaultPoseCalibration {
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

/** UI-facing calibration state and commands; lifecycle remains owned by the React adapter. */
export interface DefaultPoseCalibrationViewModel extends DefaultPoseCalibrationSnapshot {
  startRecording(): void;
  cancelCountdown(): void;
  stopRecording(): void;
  resetRecording(): void;
  trimRecording(range: RecordingTrimRange): void;
  save(): Promise<void>;
}
