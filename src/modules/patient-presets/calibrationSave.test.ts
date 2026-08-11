import { beforeEach, describe, expect, it, vi } from "vitest";
import { serializeMappingPoseFrames } from "@/modules/movement-mapping";
import { createFrameSourceStub, stillPoseFrames } from "@/modules/pose-capture/testPoses";
import { getPreset, updateDefaultPose } from "./adapters/tauriCatalogue";
import { createDefaultPoseCalibration } from "./calibration";
import { preset } from "./testCatalogue";
import type { Preset } from "./types";

vi.mock("./adapters/tauriCatalogue", () => ({
  getPreset: vi.fn(),
  updateDefaultPose: vi.fn(),
}));

const loadPreset = vi.mocked(getPreset);
const savePose = vi.mocked(updateDefaultPose);
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

describe("saving the resting pose", () => {
  it("stores the recorded pose against the preset", async () => {
    const workspace = await openedCalibration();

    await workspace.save();

    expect(savePose).toHaveBeenCalledWith("preset-1", "patient-1", RECORDED_POSE);
    expect(workspace.getSnapshot().status).toBe("saved");
  });

  it("stores the pose as it stands after any trimming", async () => {
    const workspace = await openedCalibration();
    workspace.trimRecording({ durationMs: 1160, startMs: 0, endMs: 1000 });

    await workspace.save();

    const saved = JSON.parse(savePose.mock.calls[0][2]) as Array<{ timestampMs: number }>;
    expect(saved[saved.length - 1]?.timestampMs).toBe(1000);
  });

  it("tells the clinician when it could not be stored", async () => {
    savePose.mockRejectedValue(new Error("offline"));
    const workspace = await openedCalibration();

    await workspace.save();

    expect(workspace.getSnapshot()).toMatchObject({
      status: "ready",
      error: "Failed to save the default pose. Please try again.",
    });
  });

  it("clears an earlier failure when saving is retried", async () => {
    savePose.mockRejectedValueOnce(new Error("offline"));
    const workspace = await openedCalibration();
    await workspace.save();

    await workspace.save();

    expect(workspace.getSnapshot()).toMatchObject({ status: "saved", error: null });
  });

  it("has nothing to save before the page has opened", async () => {
    await calibration().save();

    expect(savePose).not.toHaveBeenCalled();
  });

  it("has nothing to save when the page failed to open", async () => {
    const workspace = calibration();
    await workspace.start("patient-1", undefined);

    await workspace.save();

    expect(savePose).not.toHaveBeenCalled();
  });

  /** An unusable recording cannot become a preset's resting pose. */
  it("has nothing to save when nothing usable was recorded", async () => {
    loadPreset.mockResolvedValue(preset({ defaultPoseFramesJson: null }));
    const workspace = await openedCalibration();

    await workspace.save();

    expect(savePose).not.toHaveBeenCalled();
  });

  it("ignores a save that finishes after the page has gone", async () => {
    let finish: (value: Preset) => void = () => {};
    savePose.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const workspace = await openedCalibration();

    const saving = workspace.save();
    workspace.dispose();
    finish(preset());
    await saving;

    expect(workspace.getSnapshot().status).toBe("saving");
  });

  it("ignores a failed save that finishes after the page has gone", async () => {
    let fail: (error: Error) => void = () => {};
    savePose.mockImplementation(() => new Promise((_, reject) => (fail = reject)));
    const workspace = await openedCalibration();

    const saving = workspace.save();
    workspace.dispose();
    fail(new Error("offline"));
    await saving;

    expect(workspace.getSnapshot().error).toBeNull();
  });
});
