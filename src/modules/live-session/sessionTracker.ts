import type { SessionClock, SessionSnapshot, SessionTracker } from "./types";

const ELAPSED_TIME_UPDATE_MS = 1000;

class FrontendSessionTracker implements SessionTracker {
  private snapshot: SessionSnapshot = emptySnapshot();
  private readonly listeners = new Set<() => void>();
  private elapsedTimer: unknown = null;

  constructor(private readonly clock: SessionClock) {}

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = () => {
    this.clearElapsedTimer();
    this.snapshot = {
      status: "running",
      startedAt: this.clock.now(),
      endedAt: null,
      elapsedMs: 0,
      triggerCount: 0,
      triggerCountsByMapping: {},
    };
    this.notify();
    this.elapsedTimer = this.clock.setInterval(this.updateElapsedTime, ELAPSED_TIME_UPDATE_MS);
  };

  end = () => {
    if (this.snapshot.status !== "running" || this.snapshot.startedAt === null) return;
    const endedAt = this.clock.now();
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
    this.snapshot = { ...this.snapshot, elapsedMs: this.clock.now() - this.snapshot.startedAt };
    this.notify();
  };

  private clearElapsedTimer() {
    if (this.elapsedTimer !== null) this.clock.clearInterval(this.elapsedTimer);
    this.elapsedTimer = null;
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

const emptySnapshot = (): SessionSnapshot => ({
  status: "idle",
  startedAt: null,
  endedAt: null,
  elapsedMs: 0,
  triggerCount: 0,
  triggerCountsByMapping: {},
});

export const createSessionTracker = (clock: SessionClock): SessionTracker =>
  new FrontendSessionTracker(clock);
