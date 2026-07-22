import { getCameraMode } from "@/features/camera/cameraMode";
import {
  createRecognitionRuntimeService,
  type RecognitionRuntimeService,
  type RecognitionRuntimeSnapshot,
} from "@/features/movement-recognition/services/recognitionRuntimeService";
import { type RecognitionStatus } from "@/features/movement-recognition/services/recognitionService";
import { sessionService } from "./sessionService";
import { sessionWindowService } from "./sessionWindowService";
import type { LiveSessionService, LiveSessionSnapshot } from "./liveSessionService.types";

type Listener = () => void;

class OverlayLiveSessionService implements LiveSessionService {
  private snapshot: LiveSessionSnapshot = {
    cameraMode: getCameraMode(),
    elapsedMs: 0,
    phase: "idle",
    presetName: "Session",
    recognitionStatus: emptyRecognitionStatus(),
    triggerCount: 0,
  };
  private readonly listeners = new Set<Listener>();
  private recognitionRuntime: RecognitionRuntimeService | null = null;
  private unsubscribeRecognitionRuntime: (() => void) | null = null;
  private unsubscribeSession: (() => void) | null = null;
  private ownsRunningSession = false;
  private operationToken = 0;

  getSnapshot = () => this.snapshot;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = async (presetId: string | undefined) => {
    const token = ++this.operationToken;
    this.stopRuntime();

    this.snapshot = {
      cameraMode: getCameraMode(),
      elapsedMs: 0,
      phase: "loading",
      presetName: "Session",
      recognitionStatus: emptyRecognitionStatus(),
      triggerCount: 0,
    };

    if (!presetId) {
      this.publishError("Preset not found.");
      return;
    }

    this.notify();

    try {
      const recognitionRuntime = createRecognitionRuntimeService({
        defaultPoseRequiredMessage: "Record a default resting state before starting a session.",
      });
      this.recognitionRuntime = recognitionRuntime;
      this.unsubscribeRecognitionRuntime = recognitionRuntime.subscribe(
        this.publishRecognitionRuntime,
      );
      await recognitionRuntime.start(presetId);
      if (token !== this.operationToken) return;

      const runtime = recognitionRuntime.getSnapshot();
      if (runtime.phase !== "running") {
        this.publishError(runtime.error ?? "Unable to start recognition.");
        return;
      }

      this.unsubscribeSession = sessionService.subscribe(this.publishSessionSnapshot);
      this.snapshot = {
        ...this.snapshot,
        cameraMode: runtime.cameraMode,
        phase: "running",
        presetName: runtime.presetName ?? "Session",
        recognitionStatus: runtime.recognitionStatus,
      };
      this.ownsRunningSession = true;
      sessionService.start();
    } catch (error) {
      if (token !== this.operationToken) return;
      this.publishError(errorMessage(error));
    }
  };

  end = async () => {
    ++this.operationToken;
    this.finishRuntime();

    try {
      await sessionWindowService.closeOverlay();
    } catch (error) {
      this.publishError(errorMessage(error));
    }
  };

  dispose = () => {
    ++this.operationToken;
    this.stopRuntime();
  };

  private publishRecognitionRuntime = () => {
    if (!this.recognitionRuntime) return;
    const runtime = this.recognitionRuntime.getSnapshot();
    this.snapshot = {
      ...this.snapshot,
      cameraMode: runtime.cameraMode,
      presetName: runtime.presetName ?? this.snapshot.presetName,
      recognitionStatus: recognitionStatusWithRuntimeError(runtime),
    };
    this.notify();
  };

  private publishSessionSnapshot = () => {
    const session = sessionService.getSnapshot();
    this.snapshot = {
      ...this.snapshot,
      elapsedMs: session.elapsedMs,
      triggerCount: session.triggerCount,
    };
    this.notify();
  };

  private finishRuntime() {
    this.recognitionRuntime?.dispose();
    this.recognitionRuntime = null;
    this.unsubscribeRecognitionRuntime?.();
    this.unsubscribeRecognitionRuntime = null;

    if (this.ownsRunningSession) sessionService.end();
    const session = this.ownsRunningSession ? sessionService.getSnapshot() : null;
    this.ownsRunningSession = false;
    this.unsubscribeSession?.();
    this.unsubscribeSession = null;

    this.snapshot = {
      ...this.snapshot,
      elapsedMs: session?.elapsedMs ?? this.snapshot.elapsedMs,
      phase: "ended",
      triggerCount: session?.triggerCount ?? this.snapshot.triggerCount,
    };
    this.notify();
  }

  private stopRuntime() {
    this.recognitionRuntime?.dispose();
    this.recognitionRuntime = null;
    this.unsubscribeRecognitionRuntime?.();
    this.unsubscribeRecognitionRuntime = null;
    this.unsubscribeSession?.();
    this.unsubscribeSession = null;
    if (this.ownsRunningSession) sessionService.end();
    this.ownsRunningSession = false;
  }

  private publishError(message: string) {
    this.snapshot = {
      ...this.snapshot,
      phase: "error",
      recognitionStatus: {
        ...this.snapshot.recognitionStatus,
        error: message,
      },
    };
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

function emptyRecognitionStatus(error: string | null = null): RecognitionStatus {
  return {
    bestMatch: null,
    mappingStatuses: [],
    triggeredMappingId: null,
    waitingForDefaultPose: false,
    error,
  };
}

function recognitionStatusWithRuntimeError(runtime: RecognitionRuntimeSnapshot): RecognitionStatus {
  return runtime.error
    ? { ...runtime.recognitionStatus, error: runtime.error }
    : runtime.recognitionStatus;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function createLiveSessionService(): LiveSessionService {
  return new OverlayLiveSessionService();
}

export type {
  LiveSessionPhase,
  LiveSessionService,
  LiveSessionSnapshot,
} from "./liveSessionService.types";
