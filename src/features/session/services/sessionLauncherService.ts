import { sessionWindowService } from "./sessionWindowService";
import type { SessionSummary } from "./sessionSummary.types";
import type {
  SessionLauncherService,
  SessionLauncherSnapshot,
} from "./sessionLauncherService.types";

type Listener = () => void;

class MainWindowSessionLauncherService implements SessionLauncherService {
  private snapshot: SessionLauncherSnapshot = { error: null, status: "idle", summary: null };
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
      this.publish({ error: "Preset not found.", status: "error", summary: null });
      return;
    }

    this.publish({ error: null, status: "opening", summary: null });

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
      this.publish({ error: null, status: "running", summary: null });
    } catch (error) {
      if (token !== this.operationToken) return;
      this.openPromise = null;
      this.clearSessionEndedListener();
      this.publish({ error: errorMessage(error), status: "error", summary: null });
    }
  };

  end = async () => {
    const token = ++this.operationToken;
    const pendingOpen = this.openPromise;
    this.publish({ error: null, status: "ending", summary: null });

    try {
      await pendingOpen;
      // The overlay owns the live session stats, so it must be the one to
      // report them and close itself — asking it to end rather than closing
      // it here directly. handleSessionEnded fires once it reports back via
      // the "session-ended" event, carrying the real summary.
      await sessionWindowService.requestOverlayEnd();
    } catch (error) {
      if (token !== this.operationToken) return;
      this.publish({ error: errorMessage(error), status: "error", summary: null });
    }
  };

  dispose = () => {
    ++this.operationToken;
    this.openPromise = null;
    this.clearSessionEndedListener();
  };

  private handleSessionEnded = (summary: SessionSummary) => {
    this.openPromise = null;
    this.clearSessionEndedListener();
    this.publish({ error: null, status: "ended", summary });
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
