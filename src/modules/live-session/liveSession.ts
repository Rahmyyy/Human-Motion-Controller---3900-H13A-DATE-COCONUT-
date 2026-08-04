import type { PoseFrameSource } from "@/modules/pose-capture";
import { closeOverlay, onEndSessionRequested } from "./adapters/tauriSession";
import { createPresetRecognitionRuntime, emptyRecognitionStatus } from "./presetRecognition";
import type {
  EndSessionRequestedEvent,
  LiveSession,
  LiveSessionSnapshot,
  PresetRecognitionRuntime,
  PresetRecognitionSnapshot,
  SessionSummary,
  SessionTracker,
} from "./types";

interface LiveSessionDependencies {
  createRecognition(): PresetRecognitionRuntime;
  onEndRequested(listener: (event: EndSessionRequestedEvent) => void): Promise<() => void>;
  closeOverlay(sessionId: string, summary: SessionSummary): Promise<void>;
}

class OverlayLiveSession implements LiveSession {
  private snapshot: LiveSessionSnapshot = {
    elapsedMs: 0,
    phase: "idle",
    presetName: "Session",
    recognitionStatus: emptyRecognitionStatus(),
    triggerCount: 0,
  };
  private readonly listeners = new Set<() => void>();
  private recognition: PresetRecognitionRuntime | null = null;
  private unsubscribeRecognition: (() => void) | null = null;
  private unsubscribeTracker: (() => void) | null = null;
  private ownsRunningSession = false;
  private operationToken = 0;
  private unlistenEndRequested: (() => void) | null = null;
  private sessionId: string | null = null;
  private endPromise: Promise<void> | null = null;

  constructor(
    private readonly tracker: SessionTracker,
    private readonly dependencies: LiveSessionDependencies,
  ) {}

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = async (
    patientId: string | undefined,
    presetId: string | undefined,
    sessionId: string | undefined,
  ) => {
    const token = ++this.operationToken;
    this.stopRuntime();
    this.unlistenEndRequested?.();
    this.sessionId = sessionId ?? null;
    this.endPromise = null;
    const unlistenEndRequested = await this.dependencies.onEndRequested((event) => {
      if (event.sessionId === this.sessionId) void this.end();
    });
    if (token !== this.operationToken) {
      unlistenEndRequested();
      return;
    }
    this.unlistenEndRequested = unlistenEndRequested;

    this.snapshot = {
      elapsedMs: 0,
      phase: "loading",
      presetName: "Session",
      recognitionStatus: emptyRecognitionStatus(),
      triggerCount: 0,
    };
    if (!patientId || !presetId || !sessionId) {
      this.publishError("Preset not found.");
      return;
    }
    this.notify();

    try {
      const recognition = this.dependencies.createRecognition();
      this.recognition = recognition;
      this.unsubscribeRecognition = recognition.subscribe(this.publishRecognitionRuntime);
      await recognition.start(patientId, presetId);
      if (token !== this.operationToken) return;
      const runtime = recognition.getSnapshot();
      if (runtime.phase !== "running") {
        this.publishError(runtime.error ?? "Unable to start recognition.");
        return;
      }

      this.unsubscribeTracker = this.tracker.subscribe(this.publishTrackerSnapshot);
      this.snapshot = {
        ...this.snapshot,
        phase: "running",
        presetName: runtime.presetName ?? "Session",
        recognitionStatus: runtime.recognitionStatus,
      };
      this.ownsRunningSession = true;
      this.tracker.start();
    } catch (error) {
      if (token !== this.operationToken) return;
      this.publishError(errorMessage(error));
    }
  };

  end = () => {
    if (this.endPromise) return this.endPromise;
    const sessionId = this.sessionId;
    ++this.operationToken;
    const summary = this.finishRuntime();
    this.endPromise = sessionId
      ? this.dependencies.closeOverlay(sessionId, summary).catch((error) => {
          this.publishError(errorMessage(error));
        })
      : Promise.resolve();
    return this.endPromise;
  };

  dispose = () => {
    ++this.operationToken;
    this.stopRuntime();
    this.unlistenEndRequested?.();
    this.unlistenEndRequested = null;
  };

  private publishRecognitionRuntime = () => {
    if (!this.recognition) return;
    const runtime = this.recognition.getSnapshot();
    this.snapshot = {
      ...this.snapshot,
      presetName: runtime.presetName ?? this.snapshot.presetName,
      recognitionStatus: recognitionStatusWithRuntimeError(runtime),
    };
    this.notify();
  };

  private publishTrackerSnapshot = () => {
    const session = this.tracker.getSnapshot();
    this.snapshot = {
      ...this.snapshot,
      elapsedMs: session.elapsedMs,
      triggerCount: session.triggerCount,
    };
    this.notify();
  };

  private finishRuntime(): SessionSummary {
    this.recognition?.dispose();
    this.recognition = null;
    this.unsubscribeRecognition?.();
    this.unsubscribeRecognition = null;
    if (this.ownsRunningSession) this.tracker.end();
    const session = this.ownsRunningSession ? this.tracker.getSnapshot() : null;
    this.ownsRunningSession = false;
    this.unsubscribeTracker?.();
    this.unsubscribeTracker = null;
    const summary = {
      elapsedMs: session?.elapsedMs ?? this.snapshot.elapsedMs,
      triggerCount: session?.triggerCount ?? this.snapshot.triggerCount,
      triggerCountsByMapping: session?.triggerCountsByMapping ?? {},
    };
    this.snapshot = {
      ...this.snapshot,
      elapsedMs: summary.elapsedMs,
      phase: "ended",
      triggerCount: summary.triggerCount,
    };
    this.notify();
    return summary;
  }

  private stopRuntime() {
    this.recognition?.dispose();
    this.recognition = null;
    this.unsubscribeRecognition?.();
    this.unsubscribeRecognition = null;
    this.unsubscribeTracker?.();
    this.unsubscribeTracker = null;
    if (this.ownsRunningSession) this.tracker.end();
    this.ownsRunningSession = false;
  }

  private publishError(message: string) {
    this.snapshot = {
      ...this.snapshot,
      phase: "error",
      recognitionStatus: { ...this.snapshot.recognitionStatus, error: message },
    };
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

const recognitionStatusWithRuntimeError = (runtime: PresetRecognitionSnapshot) =>
  runtime.error
    ? { ...runtime.recognitionStatus, error: runtime.error }
    : runtime.recognitionStatus;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function createLiveSession(
  poseSource: PoseFrameSource,
  tracker: SessionTracker,
): LiveSession {
  return createLiveSessionWithDependencies(tracker, {
    createRecognition: () => createPresetRecognitionRuntime(poseSource, tracker),
    onEndRequested: onEndSessionRequested,
    closeOverlay,
  });
}

export function createLiveSessionWithDependencies(
  tracker: SessionTracker,
  dependencies: LiveSessionDependencies,
): LiveSession {
  return new OverlayLiveSession(tracker, dependencies);
}
