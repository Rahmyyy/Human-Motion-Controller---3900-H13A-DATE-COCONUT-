import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRACKED_LANDMARKS } from "@/modules/pose-capture";
import { createFrameSourceStub } from "@/modules/pose-capture/testPoses";
import { preset } from "@/modules/patient-presets/testCatalogue";
import { createMappingEditor, selectedLandmarksOrFallback } from "./editor";
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

describe("editor lifecycle", () => {
  it("tells the clinician when the preset was not given", async () => {
    const workspace = editor();

    await workspace.start({ patientId: "patient-1" });

    expect(workspace.getSnapshot()).toMatchObject({
      status: "error",
      error: "Preset not found.",
    });
  });

  it("tells the clinician when the patient was not given", async () => {
    const workspace = editor();

    await workspace.start({ presetId: "preset-1" });

    expect(workspace.getSnapshot().error).toBe("Preset not found.");
  });

  it("ignores a load that a newer one has overtaken", async () => {
    repository.get.mockResolvedValueOnce(mappingDetails({ name: "stale" }));
    repository.get.mockResolvedValueOnce(mappingDetails({ name: "current" }));
    const workspace = editor();

    await Promise.all([
      workspace.start({ mappingId: "a", patientId: "patient-1", presetId: "preset-1" }),
      workspace.start({ mappingId: "b", patientId: "patient-1", presetId: "preset-1" }),
    ]);

    expect(workspace.getSnapshot().movementName).toBe("current");
  });

  it("ignores a preset that arrives after a newer movement has been opened", async () => {
    const workspace = editor();
    loadPreset.mockResolvedValue(preset({ defaultPoseFramesJson: null }));

    await Promise.all([
      workspace.start({ patientId: "patient-1", presetId: "preset-1" }),
      workspace.start({ mappingId: "mapping-1", patientId: "patient-1", presetId: "preset-1" }),
    ]);

    expect(workspace.getSnapshot().status).toBe("ready");
  });

  it("ignores a failed load that a newer one has overtaken", async () => {
    loadPreset.mockRejectedValueOnce(new Error("offline"));
    const workspace = editor();

    await Promise.all([
      workspace.start({ patientId: "patient-1", presetId: "preset-1" }),
      workspace.start({ patientId: "patient-1", presetId: "preset-2" }),
    ]);

    expect(workspace.getSnapshot().error).toBeNull();
  });

  it("stops watching the camera when the page goes", async () => {
    const workspace = editor();
    await workspace.start({ patientId: "patient-1", presetId: "preset-1" });

    workspace.dispose();

    expect(camera.subscriberCount).toBe(0);
  });

  it("stops telling a listener that has unsubscribed", async () => {
    const workspace = editor();
    const listener = vi.fn();

    workspace.subscribe(listener)();
    await workspace.start({ patientId: "patient-1", presetId: "preset-1" });

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("selectedLandmarksOrFallback", () => {
  it("keeps a saved selection", () => {
    expect(selectedLandmarksOrFallback([15, 16])).toEqual([15, 16]);
  });

  it("falls back to every joint when nothing was saved", () => {
    expect(selectedLandmarksOrFallback([])).toEqual([...TRACKED_LANDMARKS]);
    expect(selectedLandmarksOrFallback(undefined)).toEqual([...TRACKED_LANDMARKS]);
  });
});
