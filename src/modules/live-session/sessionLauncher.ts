import {
  createSessionId,
  onSessionEnded,
  openOverlay,
  requestOverlayEnd,
} from "./adapters/tauriSession";
import type { SessionEndedEvent, SessionLauncher, SessionLauncherSnapshot } from "./types";

interface SessionLauncherDependencies {
  createSessionId(): string;
  openOverlay(patientId: string, presetId: string, sessionId: string): Promise<void>;
  onSessionEnded(listener: (event: SessionEndedEvent) => void): Promise<() => void>;
  requestOverlayEnd(sessionId: string): Promise<void>;
}

const realDependencies: SessionLauncherDependencies = {
  createSessionId,
  openOverlay,
  onSessionEnded,
  requestOverlayEnd,
};

class MainWindowSessionLauncher implements SessionLauncher {
  private snapshot: SessionLauncherSnapshot = { error: null, status: "idle", summary: null };
  private readonly listeners = new Set<() => void>();
  private unlistenSessionEnded: (() => void) | null = null;
  private openPromise: Promise<void> | null = null;
  private operationToken = 0;
  private sessionId: string | null = null;
  private endPromise: Promise<void> | null = null;

  constructor(private readonly dependencies: SessionLauncherDependencies) {}

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = async (patientId: string | undefined, presetId: string | undefined) => {
    const token = ++this.operationToken;
    this.clearSessionEndedListener();
    this.endPromise = null;
    if (!patientId || !presetId) {
      this.publish({ error: "Preset not found.", status: "error", summary: null });
      return;
    }

    const sessionId = this.dependencies.createSessionId();
    this.sessionId = sessionId;
    this.publish({ error: null, status: "opening", summary: null });
    try {
      const unlisten = await this.dependencies.onSessionEnded((event) => {
        if (event.sessionId === this.sessionId) this.handleSessionEnded(event);
      });
      if (token !== this.operationToken) {
        unlisten();
        return;
      }
      this.unlistenSessionEnded = unlisten;

      const openPromise = this.dependencies.openOverlay(patientId, presetId, sessionId);
      this.openPromise = openPromise;
      await openPromise;
      if (token !== this.operationToken || this.snapshot.status === "ended") return;
      this.openPromise = null;
      this.publish({ error: null, status: "running", summary: null });
    } catch (error) {
      if (token !== this.operationToken) return;
      this.openPromise = null;
      this.clearSessionEndedListener();
      this.publish({ error: errorMessage(error), status: "error", summary: null });
    }
  };

  end = () => {
    if (this.endPromise) return this.endPromise;
    if (!this.sessionId || this.snapshot.status === "ended") return Promise.resolve();
    const token = ++this.operationToken;
    const pendingOpen = this.openPromise;
    const sessionId = this.sessionId;
    this.publish({ error: null, status: "ending", summary: null });
    this.endPromise = Promise.resolve(pendingOpen)
      .then(() => this.dependencies.requestOverlayEnd(sessionId))
      .catch((error) => {
        if (token !== this.operationToken) return;
        this.publish({ error: errorMessage(error), status: "error", summary: null });
      });
    return this.endPromise;
  };

  dispose = () => {
    ++this.operationToken;
    this.openPromise = null;
    this.endPromise = null;
    this.sessionId = null;
    this.clearSessionEndedListener();
  };

  private handleSessionEnded(event: SessionEndedEvent) {
    this.openPromise = null;
    this.clearSessionEndedListener();
    this.publish({ error: null, status: "ended", summary: event.summary });
  }

  private clearSessionEndedListener() {
    this.unlistenSessionEnded?.();
    this.unlistenSessionEnded = null;
  }

  private publish(snapshot: SessionLauncherSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const createSessionLauncher = (): SessionLauncher =>
  new MainWindowSessionLauncher(realDependencies);

export const createSessionLauncherWithDependencies = (
  dependencies: SessionLauncherDependencies,
): SessionLauncher => new MainWindowSessionLauncher(dependencies);
