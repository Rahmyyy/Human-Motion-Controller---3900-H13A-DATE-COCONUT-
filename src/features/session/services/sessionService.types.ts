export type SessionStatus = "idle" | "running" | "ended";

export interface SessionSnapshot {
  status: SessionStatus;
  startedAt: number | null;
  endedAt: number | null;
  elapsedMs: number;
  triggerCount: number;
  triggerCountsByMapping: Record<string, number>;
}

/** Owns the lifecycle, elapsed time, and successful-trigger count for one frontend session. */
export interface SessionService {
  getSnapshot(): SessionSnapshot;
  subscribe(listener: () => void): () => void;
  start(): void;
  end(): void;
  recordSuccessfulTrigger(mappingId: string): void;
}
