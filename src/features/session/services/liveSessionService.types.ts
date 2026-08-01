import type { RecognitionStatus } from "@/features/movement-recognition/services/recognitionService.types";

export type LiveSessionPhase = "idle" | "loading" | "running" | "ended" | "error";

export interface LiveSessionSnapshot {
  elapsedMs: number;
  phase: LiveSessionPhase;
  presetName: string;
  recognitionStatus: RecognitionStatus;
  triggerCount: number;
}

/**
 * Owns the overlay session workflow: loading and validating its preset,
 * starting recognition and statistics, and coordinating shutdown.
 */
export interface LiveSessionService {
  getSnapshot(): LiveSessionSnapshot;
  subscribe(listener: () => void): () => void;
  start(patientId: string | undefined, presetId: string | undefined): Promise<void>;
  end(): Promise<void>;
  dispose(): void;
}
