import { beforeEach, describe, expect, it, vi } from "vitest";
import { preset } from "@/modules/patient-presets/testCatalogue";
import { createMappingCollection } from "./collection";
import { mapping, presetLoaderStub, repositoryStub } from "./testMappings";

let repository: ReturnType<typeof repositoryStub>;
let loadPreset: ReturnType<typeof presetLoaderStub>;

const collection = () => createMappingCollection(repository, loadPreset);

async function startedCollection() {
  const workspace = collection();
  await workspace.start("patient-1", "preset-1");
  return workspace;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  repository = repositoryStub();
  loadPreset = presetLoaderStub().mockResolvedValue(preset());
});

describe("createMappingCollection", () => {
  it("starts empty and idle", () => {
    expect(collection().getSnapshot()).toEqual({
      deletingMappingId: null,
      error: null,
      isLoading: false,
      mappings: [],
      preset: null,
      thresholdSaveStates: {},
    });
  });

  it("loads the preset and its movements together", async () => {
    const workspace = await startedCollection();

    expect(loadPreset).toHaveBeenCalledWith("preset-1", "patient-1");
    expect(repository.list).toHaveBeenCalledWith("preset-1");
    expect(workspace.getSnapshot().preset?.name).toBe("Mario Kart");
    expect(workspace.getSnapshot().mappings.map((entry) => entry.id)).toEqual(["mapping-1"]);
    expect(workspace.getSnapshot().isLoading).toBe(false);
  });

  /** The page draws each movement's recorded pose, so the frames are unpacked once on load. */
  it("unpacks each movement's recorded frames for the page to draw", async () => {
    const workspace = await startedCollection();

    expect(workspace.getSnapshot().mappings[0]?.poseFrames.length).toBeGreaterThan(0);
  });

  it("tells the clinician when the preset was not given", async () => {
    const workspace = collection();

    await workspace.start(undefined, "preset-1");

    expect(workspace.getSnapshot()).toMatchObject({ error: "Preset not found.", isLoading: false });
    expect(loadPreset).not.toHaveBeenCalled();
  });

  it("tells the clinician when the patient was not given", async () => {
    const workspace = collection();

    await workspace.start("patient-1", undefined);

    expect(workspace.getSnapshot().error).toBe("Preset not found.");
  });

  it("tells the clinician when the preset could not be loaded", async () => {
    loadPreset.mockRejectedValue(new Error("offline"));
    const workspace = collection();

    await workspace.start("patient-1", "preset-1");

    expect(workspace.getSnapshot()).toMatchObject({
      error: "Failed to load preset mappings.",
      isLoading: false,
    });
  });

  it("ignores a load that a newer one has overtaken", async () => {
    const workspace = collection();
    repository.list.mockResolvedValueOnce([mapping({ id: "stale" })]);

    const first = workspace.start("patient-1", "preset-1");
    const second = workspace.start("patient-1", "preset-2");
    await Promise.all([first, second]);

    expect(workspace.getSnapshot().mappings.map((entry) => entry.id)).toEqual(["mapping-1"]);
  });

  it("ignores a failed load that a newer one has overtaken", async () => {
    const workspace = collection();
    loadPreset.mockRejectedValueOnce(new Error("offline"));

    const first = workspace.start("patient-1", "preset-1");
    const second = workspace.start("patient-1", "preset-2");
    await Promise.all([first, second]);

    expect(workspace.getSnapshot().error).toBeNull();
  });

  it("ignores a load that finishes after the page has gone", async () => {
    const workspace = collection();

    const loading = workspace.start("patient-1", "preset-1");
    workspace.dispose();
    await loading;

    expect(workspace.getSnapshot().mappings).toEqual([]);
  });

  it("tells its listeners as the load progresses", async () => {
    const workspace = collection();
    const listener = vi.fn();
    workspace.subscribe(listener);

    await workspace.start("patient-1", "preset-1");

    expect(listener).toHaveBeenCalled();
  });

  it("stops telling a listener that has unsubscribed", async () => {
    const workspace = collection();
    const listener = vi.fn();

    workspace.subscribe(listener)();
    await workspace.start("patient-1", "preset-1");

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("deleting a movement", () => {
  it("removes it from the preset", async () => {
    const workspace = await startedCollection();

    await expect(workspace.deleteMapping("mapping-1")).resolves.toBe(true);

    expect(repository.delete).toHaveBeenCalledWith("mapping-1", "preset-1");
    expect(workspace.getSnapshot().mappings).toEqual([]);
    expect(workspace.getSnapshot().deletingMappingId).toBeNull();
  });

  it("tells the clinician when it could not be removed", async () => {
    repository.delete.mockRejectedValue(new Error("locked"));
    const workspace = await startedCollection();

    await expect(workspace.deleteMapping("mapping-1")).resolves.toBe(false);

    expect(workspace.getSnapshot().error).toBe("Failed to delete movement mapping.");
    expect(workspace.getSnapshot().mappings).toHaveLength(1);
  });

  it("does not start a second deletion while one is running", async () => {
    const workspace = await startedCollection();
    let finishDelete = () => {};
    repository.delete.mockImplementation(
      () => new Promise<void>((resolve) => (finishDelete = resolve)),
    );

    const first = workspace.deleteMapping("mapping-1");
    await expect(workspace.deleteMapping("mapping-1")).resolves.toBe(false);
    finishDelete();
    await first;

    expect(repository.delete).toHaveBeenCalledTimes(1);
  });

  it("has nothing to delete before a preset has been opened", async () => {
    await expect(collection().deleteMapping("mapping-1")).resolves.toBe(false);
  });
});
