import type { SessionService, SessionSnapshot } from "./sessionService.types";

type Listener = () => void;

const ELAPSED_TIME_UPDATE_MS = 1000;

class FrontendSessionService implements SessionService {
  private snapshot: SessionSnapshot = {
    status: "idle",
    startedAt: null,
    endedAt: null,
    elapsedMs: 0,
    triggerCount: 0,
    triggerCountsByMapping: {},
  };
  private readonly listeners = new Set<Listener>();
  private elapsedTimer: number | null = null;

  getSnapshot = () => this.snapshot;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = () => {
    this.clearElapsedTimer();
    this.snapshot = {
      status: "running",
      startedAt: Date.now(),
      endedAt: null,
      elapsedMs: 0,
      triggerCount: 0,
      triggerCountsByMapping: {},
    };
    this.notify();
    this.elapsedTimer = window.setInterval(this.updateElapsedTime, ELAPSED_TIME_UPDATE_MS);
  };

  end = () => {
    if (this.snapshot.status !== "running" || this.snapshot.startedAt === null) return;

    const endedAt = Date.now();
    this.clearElapsedTimer();
    this.snapshot = {
      ...this.snapshot,
      status: "ended",
      endedAt,
      elapsedMs: endedAt - this.snapshot.startedAt,
    };
    this.notify();
  };

  recordSuccessfulTrigger = (mappingId: string) => {
    if (this.snapshot.status !== "running") return;

    this.snapshot = {
      ...this.snapshot,
      triggerCount: this.snapshot.triggerCount + 1,
      triggerCountsByMapping: {
        ...this.snapshot.triggerCountsByMapping,
        [mappingId]: (this.snapshot.triggerCountsByMapping[mappingId] ?? 0) + 1,
      },
    };
    this.notify();
  };

  private updateElapsedTime = () => {
    if (this.snapshot.status !== "running" || this.snapshot.startedAt === null) return;

    this.snapshot = {
      ...this.snapshot,
      elapsedMs: Date.now() - this.snapshot.startedAt,
    };
    this.notify();
  };

  private clearElapsedTimer() {
    if (this.elapsedTimer !== null) window.clearInterval(this.elapsedTimer);
    this.elapsedTimer = null;
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const sessionService: SessionService = new FrontendSessionService();

export type { SessionService, SessionSnapshot, SessionStatus } from "./sessionService.types";
