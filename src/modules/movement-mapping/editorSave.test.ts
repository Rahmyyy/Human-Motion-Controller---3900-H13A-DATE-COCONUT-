import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFrameSourceStub } from "@/modules/pose-capture/testPoses";
import { preset } from "@/modules/patient-presets/testCatalogue";
import { createMappingEditor } from "./editor";
import { deserializeMappingPoseFrames } from "./serialization";
import { presetLoaderStub, repositoryStub } from "./testMappings";
import { PressType } from "./types";

let camera: ReturnType<typeof createFrameSourceStub>;
let repository: ReturnType<typeof repositoryStub>;

const editor = () =>
  createMappingEditor(camera.source, repository, presetLoaderStub().mockResolvedValue(preset()));

/** A new movement filled in as the clinician would before pressing save. */
async function filledInNewMovement() {
  const workspace = editor();
  await workspace.start({ patientId: "patient-1", presetId: "preset-1" });
  workspace.setMovementName("right arm raise");
  workspace.setKeybind({ code: "Space", label: "Spacebar" });
  workspace.setKeypressType(PressType.Toggle);
  workspace.setKeypressTriggerThreshold(75);
  workspace.setSelectedLandmarks([15, 16]);
  return workspace;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  camera = createFrameSourceStub();
  repository = repositoryStub();
});

describe("saving a new movement", () => {
  it("stores everything the clinician set up", async () => {
    const workspace = await filledInNewMovement();

    await workspace.save();

    expect(repository.create).toHaveBeenCalledWith({
      presetId: "preset-1",
      name: "right arm raise",
      keybind: "Spacebar",
      keypressType: "Toggle",
      keypressTriggerThresholdPercentage: 75,
      poseFramesJson: "[]",
      selectedLandmarks: [15, 16],
    });
    expect(workspace.getSnapshot().status).toBe("saved");
  });

  it("stores an empty key when the clinician chose none", async () => {
    const workspace = editor();
    await workspace.start({ patientId: "patient-1", presetId: "preset-1" });

    await workspace.save();

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ keybind: "" }));
  });

  it("tells the clinician when it could not be stored", async () => {
    repository.create.mockRejectedValue(new Error("offline"));
    const workspace = await filledInNewMovement();

    await workspace.save();

    expect(workspace.getSnapshot()).toMatchObject({
      status: "ready",
      error: "Failed to save movement mapping. Please try again.",
    });
  });
});

describe("saving changes to a movement", () => {
  async function openedSavedMovement() {
    const workspace = editor();
    await workspace.start({ mappingId: "mapping-1", patientId: "patient-1", presetId: "preset-1" });
    return workspace;
  }

  it("stores the change against the movement it belongs to", async () => {
    const workspace = await openedSavedMovement();
    workspace.setMovementName("left arm raise");

    await workspace.save();

    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "mapping-1", name: "left arm raise", presetId: "preset-1" }),
    );
    expect(repository.create).not.toHaveBeenCalled();
    expect(workspace.getSnapshot().status).toBe("saved");
  });

  it("stores the recording as it stands after any trimming", async () => {
    const workspace = await openedSavedMovement();
    workspace.trimRecording({ durationMs: 1160, startMs: 0, endMs: 400 });

    await workspace.save();

    const saved = repository.update.mock.calls[0][0].poseFramesJson;
    const frames = deserializeMappingPoseFrames(saved);
    expect(frames[frames.length - 1]?.timestampMs).toBe(400);
  });

  it("tells the clinician when the change could not be stored", async () => {
    repository.update.mockRejectedValue(new Error("offline"));
    const workspace = await openedSavedMovement();

    await workspace.save();

    expect(workspace.getSnapshot()).toMatchObject({
      status: "ready",
      error: "Failed to save changes. Please try again.",
    });
  });

  it("clears an earlier failure when saving is retried", async () => {
    repository.update.mockRejectedValueOnce(new Error("offline"));
    const workspace = await openedSavedMovement();
    await workspace.save();

    await workspace.save();

    expect(workspace.getSnapshot()).toMatchObject({ status: "saved", error: null });
  });
});

describe("saving when the editor is not ready", () => {
  it("has nothing to save before the editor has opened", async () => {
    await editor().save();

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("has nothing to save when the editor failed to open", async () => {
    const workspace = editor();
    await workspace.start({ patientId: "patient-1" });

    await workspace.save();

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("does not save twice while the first save is running", async () => {
    let finishSave = () => {};
    repository.create.mockImplementation(
      () => new Promise<void>((resolve) => (finishSave = resolve)),
    );
    const workspace = await filledInNewMovement();

    const saving = workspace.save();
    await workspace.save();
    finishSave();
    await saving;

    expect(repository.create).toHaveBeenCalledTimes(1);
  });
});
