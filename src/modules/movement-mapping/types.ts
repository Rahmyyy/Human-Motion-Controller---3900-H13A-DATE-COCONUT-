import type {
  NormalizedPoseFrame,
  PoseFrame,
  RecordingQuality,
  RecordingState,
  RecordingTrimRange,
  TrackedLandmark,
} from "@/modules/pose-capture";
import type { Preset } from "@/modules/patient-presets";

export const PressType = {
  Toggle: "Toggle",
  Press: "Press",
  Release: "Release",
  Click: "Click",
} as const;

export type PressType = (typeof PressType)[keyof typeof PressType];

export interface MovementMapping {
  id: string;
  name: string;
  keybind: string;
  keypressType: PressType;
  poseFramesJson: string;
  selectedLandmarks: number[];
  thresholdPercentage: number;
  keypressTriggerThresholdPercentage: number;
}

export interface MovementMappingDetails extends MovementMapping {
  presetId: string;
}

export interface CreateMovementMappingInput {
  presetId: string;
  name: string;
  keybind: string;
  keypressType: PressType;
  poseFramesJson: string;
  selectedLandmarks: number[];
  keypressTriggerThresholdPercentage: number;
}

export interface UpdateMovementMappingInput extends CreateMovementMappingInput {
  id: string;
}

export interface MovementMappingRepository {
  create(input: CreateMovementMappingInput): Promise<void>;
  list(presetId: string): Promise<MovementMapping[]>;
  get(id: string, presetId: string): Promise<MovementMappingDetails>;
  update(input: UpdateMovementMappingInput): Promise<void>;
  delete(id: string, presetId: string): Promise<void>;
  updateThreshold(id: string, presetId: string, thresholdPercentage: number): Promise<void>;
}

export interface PreparedMovementPlan {
  id: string;
  name: string;
  keybind: string;
  keypressType: PressType;
  frames: NormalizedPoseFrame[];
  landmarkWeights: Record<TrackedLandmark, number>;
  activeLandmarks: TrackedLandmark[];
  isDynamic: boolean;
  durationMs: number;
  keypressTriggerThreshold: number;
}

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

export interface MappingEditor {
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

/** UI-facing editor state and commands; lifecycle remains owned by the React adapter. */
export interface MappingEditorViewModel extends MappingEditorSnapshot {
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

export interface MappingViewData extends MovementMapping {
  poseFrames: PoseFrame[];
}

export type ThresholdSaveState = "idle" | "saving" | "saved" | "error";

export interface MappingCollectionSnapshot {
  deletingMappingId: string | null;
  error: string | null;
  isLoading: boolean;
  mappings: MappingViewData[];
  preset: Preset | null;
  thresholdSaveStates: Record<string, ThresholdSaveState>;
}

export interface MappingCollection {
  getSnapshot(): MappingCollectionSnapshot;
  subscribe(listener: () => void): () => void;
  start(patientId: string | undefined, presetId: string | undefined): Promise<void>;
  dispose(): void;
  deleteMapping(mappingId: string): Promise<boolean>;
  updateThreshold(mappingId: string, thresholdPercentage: number): Promise<boolean>;
}
