import type { RecognitionStatus } from "@/modules/recognition";

export type SessionStatus = "idle" | "running" | "ended";

export interface SessionSnapshot {
  status: SessionStatus;
  startedAt: number | null;
  endedAt: number | null;
  elapsedMs: number;
  triggerCount: number;
  triggerCountsByMapping: Record<string, number>;
}

export interface SessionSummary {
  elapsedMs: number;
  triggerCount: number;
  triggerCountsByMapping: Record<string, number>;
}

export interface SessionTracker {
  getSnapshot(): SessionSnapshot;
  subscribe(listener: () => void): () => void;
  start(): void;
  end(): void;
  recordSuccessfulTrigger(mappingId: string): void;
}

export interface SessionClock {
  now(): number;
  setInterval(callback: () => void, delayMs: number): unknown;
  clearInterval(handle: unknown): void;
}

export type RecognitionRuntimePhase = "idle" | "loading" | "running" | "error";

export interface PresetRecognitionSnapshot {
  error: string | null;
  phase: RecognitionRuntimePhase;
  presetName: string | null;
  recognitionStatus: RecognitionStatus;
}

export interface PresetRecognitionRuntime {
  getSnapshot(): PresetRecognitionSnapshot;
  subscribe(listener: () => void): () => void;
  start(patientId: string | undefined, presetId: string | undefined): Promise<void>;
  dispose(): void;
}

export type LiveSessionPhase = "idle" | "loading" | "running" | "ended" | "error";

export interface LiveSessionSnapshot {
  elapsedMs: number;
  phase: LiveSessionPhase;
  presetName: string;
  recognitionStatus: RecognitionStatus;
  triggerCount: number;
}

export interface LiveSession {
  getSnapshot(): LiveSessionSnapshot;
  subscribe(listener: () => void): () => void;
  start(
    patientId: string | undefined,
    presetId: string | undefined,
    sessionId: string | undefined,
  ): Promise<void>;
  end(): Promise<void>;
  dispose(): void;
}

export type SessionLauncherStatus = "idle" | "opening" | "running" | "ending" | "ended" | "error";

export interface SessionLauncherSnapshot {
  error: string | null;
  status: SessionLauncherStatus;
  summary: SessionSummary | null;
}

export interface SessionLauncher {
  getSnapshot(): SessionLauncherSnapshot;
  subscribe(listener: () => void): () => void;
  start(patientId: string | undefined, presetId: string | undefined): Promise<void>;
  end(): Promise<void>;
  dispose(): void;
}

export interface SessionEndedEvent {
  sessionId: string;
  summary: SessionSummary;
}

export interface EndSessionRequestedEvent {
  sessionId: string;
}

export interface SummaryContext {
  patientName: string;
  presetName: string;
  rows: Array<{ id: string; name: string; keybind: string; triggerCount: number }>;
}

export interface SummaryContextSnapshot {
  context: SummaryContext | null;
  isLoading: boolean;
  loadError: string | null;
}

export interface SummaryContextLoader {
  getSnapshot(): SummaryContextSnapshot;
  subscribe(listener: () => void): () => void;
  start(patientId: string, presetId: string, summary: SessionSummary): Promise<void>;
  dispose(): void;
}
