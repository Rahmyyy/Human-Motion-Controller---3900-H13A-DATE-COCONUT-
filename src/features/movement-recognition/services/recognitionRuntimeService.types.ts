import type { CameraMode } from "@/features/camera/cameraMode";
import type { RecognitionStatus } from "./recognitionService.types";

export type RecognitionRuntimePhase = "idle" | "loading" | "running" | "error";

export interface RecognitionRuntimeSnapshot {
  cameraMode: CameraMode;
  error: string | null;
  phase: RecognitionRuntimePhase;
  presetName: string | null;
  recognitionStatus: RecognitionStatus;
}

export interface RecognitionRuntimeService {
  getSnapshot(): RecognitionRuntimeSnapshot;
  subscribe(listener: () => void): () => void;
  start(patientId: string | undefined, presetId: string | undefined): Promise<void>;
  dispose(): void;
}

export interface RecognitionRuntimeOptions {
  defaultPoseRequiredMessage?: string;
}
