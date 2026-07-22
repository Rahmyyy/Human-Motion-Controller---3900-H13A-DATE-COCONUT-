import { getCameraMode } from "@/features/camera/cameraMode";
import { parsePoseFrames } from "@/features/camera/parsePoseFrames";
import { getMovementMappings } from "@/features/movement-mapping/api/movementMappingsApi";
import { getPreset } from "@/features/presets/api/presetsApi";
import { createRecognitionService, type RecognitionService } from "./recognitionService";
import type {
  RecognitionRuntimeOptions,
  RecognitionRuntimeService,
  RecognitionRuntimeSnapshot,
} from "./recognitionRuntimeService.types";
import type { RecognitionStatus } from "./recognitionService.types";

type Listener = () => void;

const DEFAULT_POSE_REQUIRED_MESSAGE = "Record a default resting state before starting recognition.";

class PresetRecognitionRuntimeService implements RecognitionRuntimeService {
  private snapshot: RecognitionRuntimeSnapshot = {
    cameraMode: getCameraMode(),
    error: null,
    phase: "idle",
    presetName: null,
    recognitionStatus: emptyRecognitionStatus(),
  };
  private readonly listeners = new Set<Listener>();
  private recognitionService: RecognitionService | null = null;
  private unsubscribeRecognition: (() => void) | null = null;
  private operationToken = 0;

  constructor(private readonly defaultPoseRequiredMessage: string) {}

  getSnapshot = () => this.snapshot;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = async (presetId: string | undefined) => {
    const token = ++this.operationToken;
    this.stopRecognition();
    this.snapshot = {
      cameraMode: getCameraMode(),
      error: null,
      phase: "loading",
      presetName: null,
      recognitionStatus: emptyRecognitionStatus(),
    };

    if (!presetId) {
      this.publishError("Preset not found.");
      return;
    }

    this.notify();

    try {
      const [preset, mappings] = await Promise.all([
        getPreset(presetId),
        getMovementMappings(presetId),
      ]);
      if (token !== this.operationToken) return;

      this.snapshot = { ...this.snapshot, presetName: preset.name };
      if (!preset.defaultPoseFramesJson) {
        this.publishError(this.defaultPoseRequiredMessage);
        return;
      }

      const recognitionService = createRecognitionService(
        mappings,
        parsePoseFrames(preset.defaultPoseFramesJson),
      );
      this.recognitionService = recognitionService;
      this.unsubscribeRecognition = recognitionService.subscribe(this.publishRecognitionStatus);
      this.snapshot = {
        ...this.snapshot,
        phase: "running",
        recognitionStatus: recognitionService.getSnapshot(),
      };
      recognitionService.start();
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
    if (!this.recognitionService) return;
    this.snapshot = {
      ...this.snapshot,
      recognitionStatus: this.recognitionService.getSnapshot(),
    };
    this.notify();
  };

  private stopRecognition() {
    this.recognitionService?.stop();
    this.recognitionService = null;
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

function emptyRecognitionStatus(): RecognitionStatus {
  return {
    bestMatch: null,
    mappingStatuses: [],
    triggeredMappingId: null,
    waitingForDefaultPose: false,
    error: null,
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function createRecognitionRuntimeService(
  options: RecognitionRuntimeOptions = {},
): RecognitionRuntimeService {
  return new PresetRecognitionRuntimeService(
    options.defaultPoseRequiredMessage ?? DEFAULT_POSE_REQUIRED_MESSAGE,
  );
}

export type {
  RecognitionRuntimeOptions,
  RecognitionRuntimePhase,
  RecognitionRuntimeService,
  RecognitionRuntimeSnapshot,
} from "./recognitionRuntimeService.types";
