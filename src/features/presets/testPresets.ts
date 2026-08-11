import { vi } from "vitest";
import type { DefaultPoseCalibrationViewModel, Preset } from "@/modules/patient-presets";

export const preset = (overrides: Partial<Preset> = {}): Preset => ({
  id: "preset-1",
  patientId: "patient-1",
  name: "Mario Kart",
  createdAt: "0",
  mappingCount: 3,
  defaultPoseFramesJson: "[]",
  ...overrides,
});

/** A ready calibration with nothing recorded yet, plus spies for every command. */
export const calibrationViewModel = (
  overrides: Partial<DefaultPoseCalibrationViewModel> = {},
): DefaultPoseCalibrationViewModel => ({
  canSave: false,
  countdownSeconds: null,
  error: null,
  presetId: "preset-1",
  recordedFrames: [],
  recordingQuality: null,
  recordingState: "idle",
  recordingTrim: null,
  status: "ready",
  cancelCountdown: vi.fn(),
  resetRecording: vi.fn(),
  save: vi.fn(),
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  trimRecording: vi.fn(),
  ...overrides,
});
