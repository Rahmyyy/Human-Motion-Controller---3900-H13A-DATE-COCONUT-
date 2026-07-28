import { parsePoseFrames } from "@/features/camera/parsePoseFrames";
import type { PoseFrame } from "@/features/camera/poseFrame";
import { analyseRecordingQuality } from "@/features/movement-mapping/recording/analyseRecordingQuality";
import type { RecordingTrimRange } from "@/features/movement-mapping/recording/trimRecording";
import {
  createRecordingService,
  type RecordingService,
} from "@/features/movement-mapping/services/recordingService";
import { TRACKED_LANDMARKS } from "@/features/movement-recognition/recognition/types";
import { getPreset, updateDefaultPose } from "../api/presetsApi";
import type {
  DefaultPoseCalibrationService,
  DefaultPoseCalibrationSnapshot,
} from "./defaultPoseCalibrationService.types";

type Listener = () => void;

class PresetDefaultPoseCalibrationService implements DefaultPoseCalibrationService {
  private snapshot: DefaultPoseCalibrationSnapshot = emptySnapshot();
  private readonly listeners = new Set<Listener>();
  private recordingService: RecordingService | null = null;
  private unsubscribeRecording: (() => void) | null = null;
  private operationToken = 0;
  private patientId: string | null = null;

  getSnapshot = () => this.snapshot;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = async (patientId: string | undefined, presetId: string | undefined) => {
    const token = ++this.operationToken;
    this.stopRecordingService();
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
      const initialFrames = parsePoseFrames(preset.defaultPoseFramesJson);
      this.initialiseRecording(initialFrames);
      this.publish({ status: "ready" });
    } catch (error) {
      if (token !== this.operationToken) return;
      console.error("Failed to load preset calibration", error);
      this.publish({ error: "Failed to load this preset.", status: "error" });
    }
  };

  dispose = () => {
    ++this.operationToken;
    this.stopRecordingService();
  };

  startRecording = () => this.recordingService?.startRecording();

  cancelCountdown = () => this.recordingService?.cancelCountdown();

  stopRecording = () => {
    this.recordingService?.stopRecording();
  };

  resetRecording = () => this.recordingService?.resetRecording();

  trimRecording = (range: RecordingTrimRange) => this.recordingService?.trimRecording(range);

  save = async () => {
    if (this.snapshot.status !== "ready" || !this.snapshot.presetId || !this.patientId) return;

    this.publish({ error: null, status: "saving" });
    try {
      await updateDefaultPose(
        this.snapshot.presetId,
        this.patientId,
        JSON.stringify(this.snapshot.recordedFrames),
      );
      this.publish({ status: "saved" });
    } catch (error) {
      console.error("Failed to save default pose", error);
      this.publish({
        error: "Failed to save the default pose. Please try again.",
        status: "ready",
      });
    }
  };

  private initialiseRecording(initialFrames: PoseFrame[]) {
    const recordingService = createRecordingService(
      initialFrames,
      initialFrames.length > 0 ? "recorded" : "idle",
    );
    this.recordingService = recordingService;
    this.unsubscribeRecording = recordingService.subscribe(this.publishRecordingSnapshot);
    recordingService.start();
    this.publishRecordingSnapshot();
  }

  private publishRecordingSnapshot = () => {
    if (!this.recordingService) return;
    const recording = this.recordingService.getSnapshot();
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

  private stopRecordingService() {
    this.recordingService?.stop();
    this.recordingService = null;
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

export function createDefaultPoseCalibrationService(): DefaultPoseCalibrationService {
  return new PresetDefaultPoseCalibrationService();
}

export type {
  DefaultPoseCalibrationService,
  DefaultPoseCalibrationSnapshot,
  DefaultPoseCalibrationStatus,
} from "./defaultPoseCalibrationService.types";
