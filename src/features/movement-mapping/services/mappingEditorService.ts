import { parsePoseFrames } from "@/features/camera/parsePoseFrames";
import type { PoseFrame } from "@/features/camera/poseFrame";
import { getPreset } from "@/features/presets/api/presetsApi";
import { TRACKED_LANDMARKS } from "@/features/movement-recognition/recognition/types";
import {
  createMovementMapping,
  getMovementMapping,
  updateMovementMapping,
} from "../api/movementMappingsApi";
import { analyseRecordingQuality } from "../recording/analyseRecordingQuality";
import type { RecordingTrimRange } from "../recording/trimRecording";
import { createRecordingService, type RecordingService } from "./recordingService";
import type {
  Keybind,
  MappingEditorInput,
  MappingEditorService,
  MappingEditorSnapshot,
} from "./mappingEditorService.types";

type Listener = () => void;

class MovementMappingEditorService implements MappingEditorService {
  private snapshot: MappingEditorSnapshot = emptySnapshot();
  private readonly listeners = new Set<Listener>();
  private recordingService: RecordingService | null = null;
  private unsubscribeRecording: (() => void) | null = null;
  private presetId: string | null = null;
  private mappingId: string | null = null;
  private operationToken = 0;

  getSnapshot = () => this.snapshot;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = async ({ mappingId, patientId, presetId }: MappingEditorInput) => {
    const token = ++this.operationToken;
    this.stopRecordingService();
    this.presetId = presetId ?? null;
    this.mappingId = mappingId ?? null;
    this.snapshot = { ...emptySnapshot(), status: "loading" };
    this.notify();

    if (!patientId || !presetId) {
      this.publishLoadError("Preset not found.");
      return;
    }

    try {
      if (mappingId) {
        const details = await getMovementMapping(mappingId, presetId);
        if (token !== this.operationToken) return;
        this.initialiseRecording(parsePoseFrames(details.pose_frames_json), "recorded");
        this.snapshot = {
          ...this.snapshot,
          keybind: keybindFromLabel(details.keybind),
          movementName: details.name,
          selectedLandmarks: initialSelection(details.selected_landmarks),
          status: "ready",
        };
        this.recalculateQuality();
        return;
      }

      const preset = await getPreset(presetId, patientId);
      if (token !== this.operationToken) return;
      if (!preset.defaultPoseFramesJson) {
        this.snapshot = { ...this.snapshot, status: "needs-calibration" };
        this.notify();
        return;
      }

      this.initialiseRecording([], "idle");
      this.snapshot = {
        ...this.snapshot,
        selectedLandmarks: [...TRACKED_LANDMARKS],
        status: "ready",
      };
      this.notify();
    } catch (error) {
      if (token !== this.operationToken) return;
      console.error("Failed to load movement mapping editor", error);
      this.publishLoadError(
        mappingId ? "Failed to load movement mapping." : "Failed to load this preset.",
      );
    }
  };

  dispose = () => {
    ++this.operationToken;
    this.stopRecordingService();
  };

  setMovementName = (movementName: string) => {
    this.publish({ movementName });
  };

  setKeybind = (keybind: Keybind) => {
    this.publish({ keybind });
  };

  setSelectedLandmarks = (selectedLandmarks: number[]) => {
    this.snapshot = { ...this.snapshot, selectedLandmarks: [...selectedLandmarks] };
    this.recalculateQuality();
  };

  startRecording = () => this.recordingService?.startRecording();

  cancelCountdown = () => this.recordingService?.cancelCountdown();

  stopRecording = () => {
    this.recordingService?.stopRecording();
  };

  resetRecording = () => this.recordingService?.resetRecording();

  trimRecording = (range: RecordingTrimRange) => this.recordingService?.trimRecording(range);

  save = async () => {
    if (this.snapshot.status !== "ready" || !this.presetId) return;

    const isEdit = Boolean(this.mappingId);
    this.publish({ error: null, status: "saving" });

    try {
      const input = {
        keybind: this.snapshot.keybind?.label ?? "",
        name: this.snapshot.movementName,
        poseFramesJson: JSON.stringify(this.snapshot.recordedFrames),
        presetId: this.presetId,
        selectedLandmarks: this.snapshot.selectedLandmarks,
      };

      if (this.mappingId) {
        await updateMovementMapping({ ...input, id: this.mappingId });
      } else {
        await createMovementMapping(input);
      }

      this.publish({ status: "saved" });
    } catch (error) {
      console.error("Failed to save movement mapping", error);
      this.publish({
        error: isEdit
          ? "Failed to save changes. Please try again."
          : "Failed to save movement mapping. Please try again.",
        status: "ready",
      });
    }
  };

  private initialiseRecording(initialFrames: PoseFrame[], initialState: "idle" | "recorded") {
    const recordingService = createRecordingService(initialFrames, initialState);
    this.recordingService = recordingService;
    this.unsubscribeRecording = recordingService.subscribe(this.publishRecordingSnapshot);
    recordingService.start();
    this.publishRecordingSnapshot();
  }

  private publishRecordingSnapshot = () => {
    if (!this.recordingService) return;
    const recording = this.recordingService.getSnapshot();
    this.snapshot = {
      ...this.snapshot,
      countdownSeconds: recording.countdownSeconds,
      recordedFrames: recording.recordedFrames,
      recordingState: recording.recordingState,
      recordingTrim: recording.recordingTrim,
    };
    this.recalculateQuality();
  };

  private recalculateQuality() {
    const recordingQuality =
      this.snapshot.recordingState === "recorded"
        ? analyseRecordingQuality(this.snapshot.recordedFrames, this.snapshot.selectedLandmarks)
        : null;
    this.snapshot = {
      ...this.snapshot,
      canSave: Boolean(recordingQuality && recordingQuality.status !== "unusable"),
      recordingQuality,
    };
    this.notify();
  }

  private stopRecordingService() {
    this.recordingService?.stop();
    this.recordingService = null;
    this.unsubscribeRecording?.();
    this.unsubscribeRecording = null;
  }

  private publish(update: Partial<MappingEditorSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    this.notify();
  }

  private publishLoadError(error: string) {
    this.publish({ error, status: "error" });
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

function emptySnapshot(): MappingEditorSnapshot {
  return {
    canSave: false,
    countdownSeconds: null,
    error: null,
    keybind: null,
    movementName: "",
    recordedFrames: [],
    recordingQuality: null,
    recordingState: "idle",
    recordingTrim: null,
    selectedLandmarks: [...TRACKED_LANDMARKS],
    status: "idle",
  };
}

function initialSelection(selected: number[] | undefined): number[] {
  return selected && selected.length > 0 ? [...selected] : [...TRACKED_LANDMARKS];
}

function keybindFromLabel(label: string): Keybind {
  return { code: label, label };
}

export function createMappingEditorService(): MappingEditorService {
  return new MovementMappingEditorService();
}

export type {
  Keybind,
  MappingEditorInput,
  MappingEditorService,
  MappingEditorSnapshot,
  MappingEditorStatus,
} from "./mappingEditorService.types";
