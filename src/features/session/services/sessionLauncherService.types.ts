export type SessionLauncherStatus = "idle" | "opening" | "running" | "ending" | "ended" | "error";

export interface SessionLauncherSnapshot {
  error: string | null;
  status: SessionLauncherStatus;
}

/** Coordinates the main window's overlay launch, shutdown, and ended event. */
export interface SessionLauncherService {
  getSnapshot(): SessionLauncherSnapshot;
  subscribe(listener: () => void): () => void;
  start(patientId: string | undefined, presetId: string | undefined): Promise<void>;
  end(): Promise<void>;
  dispose(): void;
}
