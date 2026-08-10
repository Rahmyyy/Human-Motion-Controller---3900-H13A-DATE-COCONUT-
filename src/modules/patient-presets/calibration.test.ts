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

describe("opening the resting pose calibration", () => {
  it("starts idle with nothing recorded", () => {
    expect(calibration().getSnapshot()).toEqual({
      canSave: false,
      countdownSeconds: null,
      error: null,
      presetId: null,
      recordedFrames: [],
      recordingQuality: null,
      recordingState: "idle",
      recordingTrim: null,
      status: "idle",
    });
  });

  it("reopens the pose already recorded against the preset", async () => {
    const workspace = await openedCalibration();

    expect(loadPreset).toHaveBeenCalledWith("preset-1", "patient-1");
    expect(workspace.getSnapshot()).toMatchObject({
      status: "ready",
      presetId: "preset-1",
      recordingState: "recorded",
      canSave: true,
    });
    expect(camera.subscriberCount).toBe(1);
  });

  it("opens ready to record when the preset has no pose yet", async () => {
    loadPreset.mockResolvedValue(preset({ defaultPoseFramesJson: null }));

    const workspace = await openedCalibration();

    expect(workspace.getSnapshot()).toMatchObject({
      status: "ready",
      recordingState: "idle",
      canSave: false,
    });
  });

  it("tells the clinician when the preset was not given", async () => {
    const workspace = calibration();

    await workspace.start("patient-1", undefined);

    expect(workspace.getSnapshot()).toMatchObject({
      status: "error",
      error: "Preset not found.",
    });
    expect(loadPreset).not.toHaveBeenCalled();
  });

  it("tells the clinician when the patient was not given", async () => {
    const workspace = calibration();

    await workspace.start(undefined, "preset-1");

    expect(workspace.getSnapshot().error).toBe("Preset not found.");
  });

  it("tells the clinician when the preset could not be loaded", async () => {
    loadPreset.mockRejectedValue(new Error("offline"));
    const workspace = calibration();

    await workspace.start("patient-1", "preset-1");

    expect(workspace.getSnapshot()).toMatchObject({
      status: "error",
      error: "Failed to load this preset.",
    });
  });

  it("ignores a load that a newer one has overtaken", async () => {
    loadPreset.mockResolvedValueOnce(preset({ id: "stale", defaultPoseFramesJson: null }));
    const workspace = calibration();

    await Promise.all([
      workspace.start("patient-1", "preset-1"),
      workspace.start("patient-1", "preset-2"),
    ]);

    expect(workspace.getSnapshot().recordingState).toBe("recorded");
  });

  it("ignores a failed load that a newer one has overtaken", async () => {
    loadPreset.mockRejectedValueOnce(new Error("offline"));
    const workspace = calibration();

    await Promise.all([
      workspace.start("patient-1", "preset-1"),
      workspace.start("patient-1", "preset-2"),
    ]);

    expect(workspace.getSnapshot().error).toBeNull();
  });

  it("stops watching the camera when the page goes", async () => {
    const workspace = await openedCalibration();

    workspace.dispose();

    expect(camera.subscriberCount).toBe(0);
  });

  it("stops telling a listener that has unsubscribed", async () => {
    const workspace = calibration();
    const listener = vi.fn();

    workspace.subscribe(listener)();
    await workspace.start("patient-1", "preset-1");

    expect(listener).not.toHaveBeenCalled();
  });
});
