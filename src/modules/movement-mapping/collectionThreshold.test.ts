import { beforeEach, describe, expect, it, vi } from "vitest";
import { preset } from "@/modules/patient-presets/testCatalogue";
import { createMappingCollection } from "./collection";
import { HELD_POSE_FRAMES_JSON, mapping, presetLoaderStub, repositoryStub } from "./testMappings";

let repository: ReturnType<typeof repositoryStub>;

/** Below 80% the trimmed recording no longer holds enough frames to recognise from. */
const BELOW_MINIMUM = 50;

async function startedCollection() {
  const workspace = createMappingCollection(
    repository,
    presetLoaderStub().mockResolvedValue(preset()),
  );
  await workspace.start("patient-1", "preset-1");
  return workspace;
}

const savedThreshold = (workspace: Awaited<ReturnType<typeof startedCollection>>) =>
  workspace.getSnapshot().mappings[0]?.thresholdPercentage;

const saveState = (workspace: Awaited<ReturnType<typeof startedCollection>>) =>
  workspace.getSnapshot().thresholdSaveStates["mapping-1"];

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  repository = repositoryStub();
});

describe("updating a movement threshold", () => {
  it("saves the new threshold and shows it straight away", async () => {
    const workspace = await startedCollection();

    await expect(workspace.updateThreshold("mapping-1", 90)).resolves.toBe(true);

    expect(repository.updateThreshold).toHaveBeenCalledWith("mapping-1", "preset-1", 90);
    expect(savedThreshold(workspace)).toBe(90);
    expect(saveState(workspace)).toBe("saved");
  });

  it("shows the threshold as saving while the store catches up", async () => {
    let finishSave = () => {};
    repository.updateThreshold.mockImplementation(
      () => new Promise<void>((resolve) => (finishSave = resolve)),
    );
    const workspace = await startedCollection();

    const saving = workspace.updateThreshold("mapping-1", 90);
    expect(saveState(workspace)).toBe("saving");

    finishSave();
    await saving;
  });

  it("has nothing to save when the threshold has not moved", async () => {
    const workspace = await startedCollection();

    await expect(workspace.updateThreshold("mapping-1", 100)).resolves.toBe(true);

    expect(repository.updateThreshold).not.toHaveBeenCalled();
  });

  it("refuses a threshold that would leave too little to recognise", async () => {
    const workspace = await startedCollection();

    await expect(workspace.updateThreshold("mapping-1", BELOW_MINIMUM)).resolves.toBe(false);

    expect(repository.updateThreshold).not.toHaveBeenCalled();
    expect(saveState(workspace)).toBe("error");
    expect(savedThreshold(workspace)).toBe(100);
  });

  it("refuses a threshold beyond the whole recording", async () => {
    repository.list.mockResolvedValue([mapping({ thresholdPercentage: 90 })]);
    const workspace = await startedCollection();

    await expect(workspace.updateThreshold("mapping-1", 101)).resolves.toBe(false);

    expect(saveState(workspace)).toBe("error");
  });

  /** A held pose has no movement to trim, so no threshold applies to it. */
  it("refuses a threshold on a movement that has none to offer", async () => {
    repository.list.mockResolvedValue([mapping({ poseFramesJson: HELD_POSE_FRAMES_JSON })]);
    const workspace = await startedCollection();

    await expect(workspace.updateThreshold("mapping-1", 90)).resolves.toBe(false);

    expect(saveState(workspace)).toBe("error");
  });

  it("puts the old threshold back when the save fails", async () => {
    repository.updateThreshold.mockRejectedValue(new Error("offline"));
    const workspace = await startedCollection();

    await expect(workspace.updateThreshold("mapping-1", 90)).resolves.toBe(false);

    expect(savedThreshold(workspace)).toBe(100);
    expect(saveState(workspace)).toBe("error");
  });

  it("leaves the preset's other movements alone, saved or failed", async () => {
    repository.list.mockResolvedValue([mapping(), mapping({ id: "mapping-2" })]);
    const workspace = await startedCollection();

    await workspace.updateThreshold("mapping-1", 90);
    repository.updateThreshold.mockRejectedValue(new Error("offline"));
    await workspace.updateThreshold("mapping-1", 85);

    expect(workspace.getSnapshot().mappings.map((entry) => entry.thresholdPercentage)).toEqual([
      90, 100,
    ]);
  });

  it("lets the newest save win when two are in flight", async () => {
    const finishers: Array<() => void> = [];
    repository.updateThreshold.mockImplementation(
      () => new Promise<void>((resolve) => finishers.push(resolve)),
    );
    const workspace = await startedCollection();

    const first = workspace.updateThreshold("mapping-1", 90);
    const second = workspace.updateThreshold("mapping-1", 85);
    finishers.forEach((finish) => finish());
    await Promise.all([first, second]);

    expect(savedThreshold(workspace)).toBe(85);
    expect(saveState(workspace)).toBe("saved");
  });

  it("keeps an overtaken failure to itself", async () => {
    const rejecters: Array<(error: Error) => void> = [];
    repository.updateThreshold.mockImplementation(
      () => new Promise<void>((_, reject) => rejecters.push(reject)),
    );
    const workspace = await startedCollection();

    const first = workspace.updateThreshold("mapping-1", 90);
    const second = workspace.updateThreshold("mapping-1", 85);
    rejecters.forEach((reject) => reject(new Error("offline")));

    await expect(first).resolves.toBe(false);
    await second;
    expect(savedThreshold(workspace)).toBe(90);
  });

  it("has no threshold to change on a movement the preset does not have", async () => {
    const workspace = await startedCollection();

    await expect(workspace.updateThreshold("missing", 90)).resolves.toBe(true);
  });

  it("has nothing to change before a preset has been opened", async () => {
    const workspace = createMappingCollection(repository, presetLoaderStub());

    await expect(workspace.updateThreshold("mapping-1", 90)).resolves.toBe(false);
  });
});
