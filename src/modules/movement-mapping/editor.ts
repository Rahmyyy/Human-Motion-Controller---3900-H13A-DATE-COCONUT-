import { getPreset, type Preset } from "@/modules/patient-presets";
import {
  TRACKED_LANDMARKS,
  analyseRecordingQuality,
  createPoseRecording,
  type PoseFrame,
  type PoseFrameSource,
  type PoseRecording,
  type RecordingTrimRange,
} from "@/modules/pose-capture";
import {
  DEFAULT_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE,
  MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE,
  MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE,
  clamp,
} from "./analysis";
import { deserializeMappingPoseFrames, serializeMappingPoseFrames } from "./serialization";
import { PressType } from "./types";
import type {
  Keybind,
  MappingEditor,
  MappingEditorInput,
  MappingEditorSnapshot,
  MovementMappingRepository,
} from "./types";

type PresetLoader = (id: string, patientId: string) => Promise<Preset>;

class MovementMappingEditor implements MappingEditor {
  private snapshot: MappingEditorSnapshot = emptySnapshot();
  private readonly listeners = new Set<() => void>();
  private recording: PoseRecording | null = null;
  private unsubscribeRecording: (() => void) | null = null;
  private presetId: string | null = null;
  private mappingId: string | null = null;
  private operationToken = 0;

  constructor(
    private readonly frameSource: PoseFrameSource,
    private readonly repository: MovementMappingRepository,
    private readonly loadPreset: PresetLoader,
  ) {}

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
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
        const details = await this.repository.get(mappingId, presetId);
        if (token !== this.operationToken) return;
        this.initialiseRecording(deserializeMappingPoseFrames(details.poseFramesJson), "recorded");
        this.snapshot = {
          ...this.snapshot,
          keybind: keybindFromLabel(details.keybind),
          keypressType: details.keypressType,
          keypressTriggerThresholdPercentage: details.keypressTriggerThresholdPercentage,
          movementName: details.name,
          selectedLandmarks: selectedLandmarksOrFallback(details.selectedLandmarks),
          status: "ready",
        };
        this.recalculateQuality();
        return;
      }

      const preset = await this.loadPreset(presetId, patientId);
      if (token !== this.operationToken) return;
      if (!preset.defaultPoseFramesJson) {
        this.snapshot = { ...this.snapshot, status: "needs-calibration" };
        this.notify();
        return;
      }

      this.initialiseRecording([], "idle");
      this.snapshot = {
        ...this.snapshot,
        keypressType: PressType.Click,
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

  setMovementName = (movementName: string) => this.publish({ movementName });
  setKeybind = (keybind: Keybind) => this.publish({ keybind });
  setKeypressType = (keypressType: PressType) => this.publish({ keypressType });
  setKeypressTriggerThreshold = (percentage: number) =>
    this.publish({
      keypressTriggerThresholdPercentage: clamp(
        Math.round(percentage),
        MIN_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE,
        MAX_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE,
      ),
    });

  setSelectedLandmarks = (selectedLandmarks: number[]) => {
    this.snapshot = { ...this.snapshot, selectedLandmarks: [...selectedLandmarks] };
    this.recalculateQuality();
  };

  startRecording = () => this.recording?.startRecording();
  cancelCountdown = () => this.recording?.cancelCountdown();
  stopRecording = () => this.recording?.stopRecording();
  resetRecording = () => this.recording?.resetRecording();
  trimRecording = (range: RecordingTrimRange) => this.recording?.trimRecording(range);

  save = async () => {
    if (this.snapshot.status !== "ready" || !this.presetId) return;
    const isEdit = Boolean(this.mappingId);
    this.publish({ error: null, status: "saving" });
    try {
      const input = {
        keybind: this.snapshot.keybind?.label ?? "",
        keypressType: this.snapshot.keypressType,
        keypressTriggerThresholdPercentage: this.snapshot.keypressTriggerThresholdPercentage,
        name: this.snapshot.movementName,
        poseFramesJson: serializeMappingPoseFrames(this.snapshot.recordedFrames),
        presetId: this.presetId,
        selectedLandmarks: this.snapshot.selectedLandmarks,
      };
      if (this.mappingId) await this.repository.update({ ...input, id: this.mappingId });
      else await this.repository.create(input);
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
    this.recording = createPoseRecording(this.frameSource, initialFrames, initialState);
    this.unsubscribeRecording = this.recording.subscribe(this.publishRecordingSnapshot);
    this.recording.start();
    this.publishRecordingSnapshot();
  }

  private publishRecordingSnapshot = () => {
    if (!this.recording) return;
    const recording = this.recording.getSnapshot();
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
    this.recording?.stop();
    this.recording = null;
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
    keypressType: PressType.Click,
    keypressTriggerThresholdPercentage: DEFAULT_KEYPRESS_TRIGGER_THRESHOLD_PERCENTAGE,
    movementName: "",
    recordedFrames: [],
    recordingQuality: null,
    recordingState: "idle",
    recordingTrim: null,
    selectedLandmarks: [...TRACKED_LANDMARKS],
    status: "idle",
  };
}

export function selectedLandmarksOrFallback(selected: number[] | undefined): number[] {
  return selected && selected.length > 0 ? [...selected] : [...TRACKED_LANDMARKS];
}

const keybindFromLabel = (label: string): Keybind => ({ code: label, label });

export function createMappingEditor(
  frameSource: PoseFrameSource,
  repository: MovementMappingRepository,
  loadPreset: PresetLoader = getPreset,
): MappingEditor {
  return new MovementMappingEditor(frameSource, repository, loadPreset);
}
