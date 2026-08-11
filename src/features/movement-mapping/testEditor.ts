import { vi } from "vitest";
import { PressType, type MappingEditorViewModel } from "@/modules/movement-mapping";
import { TRACKED_LANDMARKS, type RecordingQuality } from "@/modules/pose-capture";

/** A ready editor with no recording yet, plus spies for every command the UI can issue. */
export function editorViewModel(
  overrides: Partial<MappingEditorViewModel> = {},
): MappingEditorViewModel {
  return {
    canSave: false,
    countdownSeconds: null,
    error: null,
    keybind: null,
    keypressType: PressType.Click,
    keypressTriggerThresholdPercentage: 60,
    movementName: "",
    recordedFrames: [],
    recordingQuality: null,
    recordingState: "idle",
    recordingTrim: null,
    selectedLandmarks: [],
    status: "ready",
    cancelCountdown: vi.fn(),
    resetRecording: vi.fn(),
    save: vi.fn(),
    setKeybind: vi.fn(),
    setKeypressType: vi.fn(),
    setKeypressTriggerThreshold: vi.fn(),
    setMovementName: vi.fn(),
    setSelectedLandmarks: vi.fn(),
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    trimRecording: vi.fn(),
    ...overrides,
  };
}

export const recordingQuality: RecordingQuality = {
  status: "good",
  totalFrames: 40,
  usableFrames: 40,
  usableFramePercentage: 100,
  jointVisibility: Object.fromEntries(
    TRACKED_LANDMARKS.map((index) => [index, 1]),
  ) as RecordingQuality["jointVisibility"],
  issues: [],
};
