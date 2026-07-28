import { sessionWindowService } from "./sessionWindowService";
import type {
  SessionLauncherService,
  SessionLauncherSnapshot,
} from "./sessionLauncherService.types";

type Listener = () => void;

class MainWindowSessionLauncherService implements SessionLauncherService {
  private snapshot: SessionLauncherSnapshot = { error: null, status: "idle" };
  private readonly listeners = new Set<Listener>();
  private unlistenSessionEnded: (() => void) | null = null;
  private openPromise: Promise<void> | null = null;
  private operationToken = 0;

  getSnapshot = () => this.snapshot;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = async (patientId: string | undefined, presetId: string | undefined) => {
    const token = ++this.operationToken;
    this.clearSessionEndedListener();

    if (!patientId || !presetId) {
      this.publish({ error: "Preset not found.", status: "error" });
      return;
    }

    this.publish({ error: null, status: "opening" });

    try {
      const unlisten = await sessionWindowService.onSessionEnded(this.handleSessionEnded);
      if (token !== this.operationToken) {
        unlisten();
        return;
      }
      this.unlistenSessionEnded = unlisten;

      const openPromise = sessionWindowService.openOverlay(patientId, presetId);
      this.openPromise = openPromise;
      await openPromise;
      if (token !== this.operationToken || this.snapshot.status === "ended") return;

      this.openPromise = null;
      this.publish({ error: null, status: "running" });
    } catch (error) {
      if (token !== this.operationToken) return;
      this.openPromise = null;
      this.clearSessionEndedListener();
      this.publish({ error: errorMessage(error), status: "error" });
    }
  };

  end = async () => {
    const token = ++this.operationToken;
    const pendingOpen = this.openPromise;
    this.publish({ error: null, status: "ending" });

    try {
      await pendingOpen;
      await sessionWindowService.closeOverlay();
      if (token !== this.operationToken) return;
      this.handleSessionEnded();
    } catch (error) {
      if (token !== this.operationToken) return;
      this.publish({ error: errorMessage(error), status: "error" });
    }
  };

  dispose = () => {
    ++this.operationToken;
    this.openPromise = null;
    this.clearSessionEndedListener();
  };

  private handleSessionEnded = () => {
    this.openPromise = null;
    this.clearSessionEndedListener();
    this.publish({ error: null, status: "ended" });
  };

  private clearSessionEndedListener() {
    this.unlistenSessionEnded?.();
    this.unlistenSessionEnded = null;
  }

  private publish(snapshot: SessionLauncherSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function createSessionLauncherService(): SessionLauncherService {
  return new MainWindowSessionLauncherService();
}

export type {
  SessionLauncherService,
  SessionLauncherSnapshot,
  SessionLauncherStatus,
} from "./sessionLauncherService.types";
