import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRACKED_LANDMARKS } from "@/modules/pose-capture";
import { createFrameSourceStub } from "@/modules/pose-capture/testPoses";
import { preset } from "@/modules/patient-presets/testCatalogue";
import { createMappingEditor } from "./editor";
import { mappingDetails, presetLoaderStub, repositoryStub } from "./testMappings";

let camera: ReturnType<typeof createFrameSourceStub>;
let repository: ReturnType<typeof repositoryStub>;
let loadPreset: ReturnType<typeof presetLoaderStub>;

const editor = () => createMappingEditor(camera.source, repository, loadPreset);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  camera = createFrameSourceStub();
  repository = repositoryStub();
  loadPreset = presetLoaderStub().mockResolvedValue(preset());
});

describe("opening the editor for a new movement", () => {
  it("starts ready to record, watching every joint", async () => {
    const workspace = editor();

    await workspace.start({ patientId: "patient-1", presetId: "preset-1" });

    expect(workspace.getSnapshot()).toMatchObject({
      status: "ready",
      keypressType: "Click",
      movementName: "",
      recordingState: "idle",
      selectedLandmarks: [...TRACKED_LANDMARKS],
      canSave: false,
    });
    expect(camera.subscriberCount).toBe(1);
  });

  /** Recognition compares against the resting pose, so it has to exist first. */
  it("asks for the resting pose first when the preset has none", async () => {
    loadPreset.mockResolvedValue(preset({ defaultPoseFramesJson: null }));
    const workspace = editor();

    await workspace.start({ patientId: "patient-1", presetId: "preset-1" });

    expect(workspace.getSnapshot().status).toBe("needs-calibration");
    expect(camera.subscriberCount).toBe(0);
  });

  it("tells the clinician when the preset could not be loaded", async () => {
    loadPreset.mockRejectedValue(new Error("offline"));
    const workspace = editor();

    await workspace.start({ patientId: "patient-1", presetId: "preset-1" });

    expect(workspace.getSnapshot()).toMatchObject({
      status: "error",
      error: "Failed to load this preset.",
    });
  });
});

describe("opening the editor for a saved movement", () => {
  it("reopens it with its recording and settings", async () => {
    repository.get.mockResolvedValue(
      mappingDetails({
        name: "right arm raise",
        keybind: "Enter",
        keypressTriggerThresholdPercentage: 75,
        selectedLandmarks: [15, 16],
      }),
    );
    const workspace = editor();

    await workspace.start({ mappingId: "mapping-1", patientId: "patient-1", presetId: "preset-1" });

    expect(repository.get).toHaveBeenCalledWith("mapping-1", "preset-1");
    expect(workspace.getSnapshot()).toMatchObject({
      status: "ready",
      movementName: "right arm raise",
      keybind: { code: "Enter", label: "Enter" },
      keypressTriggerThresholdPercentage: 75,
      selectedLandmarks: [15, 16],
      recordingState: "recorded",
    });
    expect(loadPreset).not.toHaveBeenCalled();
  });

  it("judges the reopened recording so it can be saved again unchanged", async () => {
    const workspace = editor();

    await workspace.start({ mappingId: "mapping-1", patientId: "patient-1", presetId: "preset-1" });

    expect(workspace.getSnapshot().recordingQuality?.status).toBe("good");
    expect(workspace.getSnapshot().canSave).toBe(true);
  });

  /** A mapping saved before joint selection existed watches every joint. */
  it("falls back to every joint for a movement saved without a selection", async () => {
    repository.get.mockResolvedValue(mappingDetails({ selectedLandmarks: [] }));
    const workspace = editor();

    await workspace.start({ mappingId: "mapping-1", patientId: "patient-1", presetId: "preset-1" });

    expect(workspace.getSnapshot().selectedLandmarks).toEqual([...TRACKED_LANDMARKS]);
  });

  it("tells the clinician when it could not be loaded", async () => {
    repository.get.mockRejectedValue(new Error("offline"));
    const workspace = editor();

    await workspace.start({ mappingId: "mapping-1", patientId: "patient-1", presetId: "preset-1" });

    expect(workspace.getSnapshot()).toMatchObject({
      status: "error",
      error: "Failed to load movement mapping.",
    });
  });
});
