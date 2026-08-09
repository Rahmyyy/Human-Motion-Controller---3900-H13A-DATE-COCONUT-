import { getMovementMappings } from "@/modules/movement-mapping";
import { getPreset } from "@/modules/patient-presets";
import { parsePoseFrames, type PoseFrameSource } from "@/modules/pose-capture";
import {
  createRecognitionRuntime,
  type RecognitionRuntime,
  type RecognitionStatus,
} from "@/modules/recognition";
import { browserRecognitionClock } from "./adapters/browserClock";
import { executeAction } from "./adapters/tauriSession";
import type { PresetRecognitionRuntime, PresetRecognitionSnapshot, SessionTracker } from "./types";

interface PresetRecognitionDependencies {
  loadPreset: typeof getPreset;
  loadMappings: typeof getMovementMappings;
  createRuntime: typeof createRecognitionRuntime;
  executeAction: typeof executeAction;
}

const realDependencies: PresetRecognitionDependencies = {
  loadPreset: getPreset,
  loadMappings: getMovementMappings,
  createRuntime: createRecognitionRuntime,
  executeAction,
};

class LoadedPresetRecognition implements PresetRecognitionRuntime {
  private snapshot: PresetRecognitionSnapshot = {
    error: null,
    phase: "idle",
    presetName: null,
    recognitionStatus: emptyRecognitionStatus(),
  };
  private readonly listeners = new Set<() => void>();
  private recognition: RecognitionRuntime | null = null;
  private unsubscribeRecognition: (() => void) | null = null;
  private operationToken = 0;

  constructor(
    private readonly poseSource: PoseFrameSource,
    private readonly tracker: SessionTracker,
    private readonly defaultPoseRequiredMessage: string,
    private readonly dependencies: PresetRecognitionDependencies,
  ) {}

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = async (patientId: string | undefined, presetId: string | undefined) => {
    const token = ++this.operationToken;
    this.stopRecognition();
    this.snapshot = {
      error: null,
      phase: "loading",
      presetName: null,
      recognitionStatus: emptyRecognitionStatus(),
    };
    if (!patientId || !presetId) {
      this.publishError("Preset not found.");
      return;
    }
    this.notify();

    try {
      const [preset, mappings] = await Promise.all([
        this.dependencies.loadPreset(presetId, patientId),
        this.dependencies.loadMappings(presetId),
      ]);
      if (token !== this.operationToken) return;
      this.snapshot = { ...this.snapshot, presetName: preset.name };
      if (!preset.defaultPoseFramesJson) {
        this.publishError(this.defaultPoseRequiredMessage);
        return;
      }

      const recognition = this.dependencies.createRuntime({
        mappings,
        defaultPoseFrames: parsePoseFrames(preset.defaultPoseFramesJson),
        poseSource: this.poseSource,
        clock: browserRecognitionClock,
        handleTrigger: async (decision) => {
          await this.dependencies.executeAction(decision.keybind, decision.keypressType);
          this.tracker.recordSuccessfulTrigger(decision.mappingId);
        },
      });
      this.recognition = recognition;
      this.unsubscribeRecognition = recognition.subscribe(this.publishRecognitionStatus);
      this.snapshot = {
        ...this.snapshot,
        phase: "running",
        recognitionStatus: recognition.getSnapshot(),
      };
      recognition.start();
      this.notify();
    } catch (error) {
      if (token !== this.operationToken) return;
      this.publishError(errorMessage(error));
    }
  };

  dispose = () => {
    ++this.operationToken;
    this.stopRecognition();
  };

  private publishRecognitionStatus = () => {
    if (!this.recognition) return;
    this.snapshot = { ...this.snapshot, recognitionStatus: this.recognition.getSnapshot() };
    this.notify();
  };

  private stopRecognition() {
    this.recognition?.stop();
    this.recognition = null;
    this.unsubscribeRecognition?.();
    this.unsubscribeRecognition = null;
  }

  private publishError(message: string) {
    this.stopRecognition();
    this.snapshot = { ...this.snapshot, error: message, phase: "error" };
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export function createPresetRecognitionRuntime(
  poseSource: PoseFrameSource,
  tracker: SessionTracker,
  defaultPoseRequiredMessage = "Record a default resting state before starting recognition.",
): PresetRecognitionRuntime {
  return createPresetRecognitionRuntimeWithDependencies(
    poseSource,
    tracker,
    defaultPoseRequiredMessage,
    realDependencies,
  );
}

export function createPresetRecognitionRuntimeWithDependencies(
  poseSource: PoseFrameSource,
  tracker: SessionTracker,
  defaultPoseRequiredMessage: string,
  dependencies: PresetRecognitionDependencies,
): PresetRecognitionRuntime {
  return new LoadedPresetRecognition(poseSource, tracker, defaultPoseRequiredMessage, dependencies);
}

export function emptyRecognitionStatus(error: string | null = null): RecognitionStatus {
  return {
    bestMatch: null,
    mappingStatuses: [],
    triggeredMappingId: null,
    waitingForDefaultPose: false,
    error,
  };
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));
