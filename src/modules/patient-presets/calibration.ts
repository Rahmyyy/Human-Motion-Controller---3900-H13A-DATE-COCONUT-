import {
  TRACKED_LANDMARKS,
  analyseRecordingQuality,
  createPoseRecording,
  parsePoseFrames,
  type PoseFrame,
  type PoseFrameSource,
  type PoseRecording,
  type RecordingTrimRange,
} from "@/modules/pose-capture";
import { getPreset, updateDefaultPose } from "./adapters/tauriCatalogue";
import type { DefaultPoseCalibration, DefaultPoseCalibrationSnapshot } from "./types";

class PresetDefaultPoseCalibration implements DefaultPoseCalibration {
  private snapshot: DefaultPoseCalibrationSnapshot = emptySnapshot();
  private readonly listeners = new Set<() => void>();
  private recording: PoseRecording | null = null;
  private unsubscribeRecording: (() => void) | null = null;
  private operationToken = 0;
  private patientId: string | null = null;

  constructor(private readonly frameSource: PoseFrameSource) {}

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = async (patientId: string | undefined, presetId: string | undefined) => {
    const token = ++this.operationToken;
    this.stopRecordingWorkspace();
    this.snapshot = { ...emptySnapshot(), presetId: presetId ?? null, status: "loading" };
    this.notify();

    this.patientId = patientId ?? null;
    if (!patientId || !presetId) {
      this.publish({ error: "Preset not found.", status: "error" });
      return;
    }

    try {
      const preset = await getPreset(presetId, patientId);
      if (token !== this.operationToken) return;
      this.initialiseRecording(parsePoseFrames(preset.defaultPoseFramesJson));
      this.publish({ status: "ready" });
    } catch (error) {
      if (token !== this.operationToken) return;
      console.error("Failed to load preset calibration", error);
      this.publish({ error: "Failed to load this preset.", status: "error" });
    }
  };

  dispose = () => {
    ++this.operationToken;
    this.stopRecordingWorkspace();
  };

  startRecording = () => this.recording?.startRecording();
  cancelCountdown = () => this.recording?.cancelCountdown();
  stopRecording = () => void this.recording?.stopRecording();
  resetRecording = () => this.recording?.resetRecording();
  trimRecording = (range: RecordingTrimRange) => this.recording?.trimRecording(range);

  save = async () => {
    if (
      this.snapshot.status !== "ready" ||
      !this.snapshot.canSave ||
      !this.snapshot.presetId ||
      !this.patientId
    ) {
      return;
    }

    const token = ++this.operationToken;
    this.publish({ error: null, status: "saving" });
    try {
      await updateDefaultPose(
        this.snapshot.presetId,
        this.patientId,
        JSON.stringify(this.snapshot.recordedFrames),
      );
      if (token !== this.operationToken) return;
      this.publish({ status: "saved" });
    } catch (error) {
      if (token !== this.operationToken) return;
      console.error("Failed to save default pose", error);
      this.publish({
        error: "Failed to save the default pose. Please try again.",
        status: "ready",
      });
    }
  };

  private initialiseRecording(initialFrames: PoseFrame[]) {
    const recording = createPoseRecording(
      this.frameSource,
      initialFrames,
      initialFrames.length > 0 ? "recorded" : "idle",
    );
    this.recording = recording;
    this.unsubscribeRecording = recording.subscribe(this.publishRecordingSnapshot);
    recording.start();
    this.publishRecordingSnapshot();
  }

  private publishRecordingSnapshot = () => {
    if (!this.recording) return;
    const recording = this.recording.getSnapshot();
    const recordingQuality =
      recording.recordingState === "recorded"
        ? analyseRecordingQuality(recording.recordedFrames, [...TRACKED_LANDMARKS])
        : null;
    this.snapshot = {
      ...this.snapshot,
      canSave: Boolean(recordingQuality && recordingQuality.status !== "unusable"),
      countdownSeconds: recording.countdownSeconds,
      recordedFrames: recording.recordedFrames,
      recordingQuality,
      recordingState: recording.recordingState,
      recordingTrim: recording.recordingTrim,
    };
    this.notify();
  };

  private stopRecordingWorkspace() {
    this.recording?.stop();
    this.recording = null;
    this.unsubscribeRecording?.();
    this.unsubscribeRecording = null;
  }

  private publish(update: Partial<DefaultPoseCalibrationSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

function emptySnapshot(): DefaultPoseCalibrationSnapshot {
  return {
    canSave: false,
    countdownSeconds: null,
    error: null,
    presetId: null,
    recordedFrames: [],
    recordingQuality: null,
    recordingState: "idle",
    recordingTrim: null,
    status: "idle",
  };
}

export function createDefaultPoseCalibration(frameSource: PoseFrameSource): DefaultPoseCalibration {
  return new PresetDefaultPoseCalibration(frameSource);
}
