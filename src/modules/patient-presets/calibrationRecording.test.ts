import { beforeEach, describe, expect, it, vi } from "vitest";
import { serializeMappingPoseFrames } from "@/modules/movement-mapping";
import { createFrameSourceStub, stillPoseFrames } from "@/modules/pose-capture/testPoses";
import { getPreset, updateDefaultPose } from "./adapters/tauriCatalogue";
import { createDefaultPoseCalibration } from "./calibration";
import { preset } from "./testCatalogue";

vi.mock("./adapters/tauriCatalogue", () => ({
  getPreset: vi.fn(),
  updateDefaultPose: vi.fn(),
}));

const loadPreset = vi.mocked(getPreset);
const savePose = vi.mocked(updateDefaultPose);

/** A resting pose already recorded against the preset. */
const RECORDED_POSE = serializeMappingPoseFrames(stillPoseFrames(30));

let camera: ReturnType<typeof createFrameSourceStub>;

const calibration = () => createDefaultPoseCalibration(camera.source);

async function openedCalibration() {
  const workspace = calibration();
  await workspace.start("patient-1", "preset-1");
  return workspace;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  camera = createFrameSourceStub();
  loadPreset.mockResolvedValue(preset({ defaultPoseFramesJson: RECORDED_POSE }));
  savePose.mockResolvedValue(preset());
});

describe("recording the resting pose", () => {
  it("counts the patient in before recording", async () => {
    const workspace = await openedCalibration();

    workspace.startRecording();

    expect(workspace.getSnapshot()).toMatchObject({
      recordingState: "countdown",
      countdownSeconds: 3,
    });
  });

  it("returns to idle when the countdown is cancelled", async () => {
    const workspace = await openedCalibration();
    workspace.startRecording();

    workspace.cancelCountdown();

    expect(workspace.getSnapshot().recordingState).toBe("idle");
  });

  it("throws the take away when the recording is reset", async () => {
    const workspace = await openedCalibration();

    workspace.resetRecording();

    expect(workspace.getSnapshot()).toMatchObject({
      recordingState: "idle",
      recordedFrames: [],
      canSave: false,
    });
  });

  it("narrows the take to the trimmed range", async () => {
    const workspace = await openedCalibration();
    const fullLength = workspace.getSnapshot().recordedFrames.length;

    workspace.trimRecording({ durationMs: 1160, startMs: 0, endMs: 400 });

    expect(workspace.getSnapshot().recordedFrames.length).toBeLessThan(fullLength);
  });

  /** The page can call these before the calibration has finished opening. */
  it("has no recording to command before the page has opened", () => {
    const workspace = calibration();

    expect(() => {
      workspace.startRecording();
      workspace.cancelCountdown();
      workspace.stopRecording();
      workspace.resetRecording();
      workspace.trimRecording({ durationMs: 0, startMs: 0, endMs: 0 });
    }).not.toThrow();
  });
});
