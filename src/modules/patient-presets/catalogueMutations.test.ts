import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPreset as createPresetNative,
  deletePreset as deletePresetNative,
  duplicatePreset as duplicatePresetNative,
  getPresets,
} from "./adapters/tauriCatalogue";
import { createPresetSelectionService } from "./catalogue";
import { preset } from "./testCatalogue";
import type { Preset } from "./types";

vi.mock("./adapters/tauriCatalogue", () => ({
  getPresets: vi.fn(),
  createPreset: vi.fn(),
  duplicatePreset: vi.fn(),
  deletePreset: vi.fn(),
}));

const kart = preset({ id: "preset-1", name: "Mario Kart" });
const chess = preset({ id: "preset-2", name: "Chess" });
const created = preset({ id: "preset-3", name: "Tetris" });

const createNative = vi.mocked(createPresetNative);
const duplicateNative = vi.mocked(duplicatePresetNative);
const deleteNative = vi.mocked(deletePresetNative);

async function startedCatalogue() {
  const catalogue = createPresetSelectionService();
  await catalogue.start("patient-1");
  return catalogue;
}

const presetIds = (catalogue: Awaited<ReturnType<typeof startedCatalogue>>) =>
  catalogue.getSnapshot().presets.map((entry) => entry.id);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getPresets).mockResolvedValue([kart, chess]);
  createNative.mockResolvedValue(created);
  duplicateNative.mockResolvedValue(created);
  deleteNative.mockResolvedValue(undefined);
});

describe("creating a preset", () => {
  it("adds it at the top and opens it", async () => {
    const catalogue = await startedCatalogue();

    await expect(catalogue.createPreset("Tetris")).resolves.toEqual(created);

    expect(createNative).toHaveBeenCalledWith("patient-1", "Tetris");
    expect(presetIds(catalogue)).toEqual(["preset-3", "preset-1", "preset-2"]);
    expect(catalogue.getSnapshot().selectedPreset).toEqual(created);
    expect(catalogue.getSnapshot().isCreating).toBe(false);
  });

  it("trims the name the clinician typed", async () => {
    const catalogue = await startedCatalogue();

    await catalogue.createPreset("  Tetris  ");

    expect(createNative).toHaveBeenCalledWith("patient-1", "Tetris");
  });

  it("has nothing to create from a blank name", async () => {
    const catalogue = await startedCatalogue();

    await expect(catalogue.createPreset("   ")).resolves.toBeNull();

    expect(createNative).not.toHaveBeenCalled();
  });

  it("has no patient to create a preset for before the page has loaded", async () => {
    await expect(createPresetSelectionService().createPreset("Tetris")).resolves.toBeNull();
  });

  it("does not create a second preset while one is being created", async () => {
    let finish: (value: Preset) => void = () => {};
    createNative.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const catalogue = await startedCatalogue();

    const creating = catalogue.createPreset("Tetris");
    await expect(catalogue.createPreset("Chess")).resolves.toBeNull();
    finish(created);
    await creating;

    expect(createNative).toHaveBeenCalledTimes(1);
  });

  it("tells the clinician when it could not be created", async () => {
    createNative.mockRejectedValue(new Error("offline"));
    const catalogue = await startedCatalogue();

    await expect(catalogue.createPreset("Tetris")).resolves.toBeNull();

    expect(catalogue.getSnapshot().createError).toBe(
      "This preset could not be created. Please try again.",
    );
    expect(catalogue.getSnapshot().isCreating).toBe(false);
  });

  it("clears the message once the clinician has read it", async () => {
    createNative.mockRejectedValue(new Error("offline"));
    const catalogue = await startedCatalogue();
    await catalogue.createPreset("Tetris");

    catalogue.clearCreateError();

    expect(catalogue.getSnapshot().createError).toBeNull();
  });
});

describe("duplicating a preset", () => {
  it("adds the copy at the top and opens it", async () => {
    const catalogue = await startedCatalogue();

    await expect(catalogue.duplicatePreset("preset-1")).resolves.toEqual(created);

    expect(duplicateNative).toHaveBeenCalledWith("preset-1");
    expect(presetIds(catalogue)).toEqual(["preset-3", "preset-1", "preset-2"]);
    expect(catalogue.getSnapshot().duplicatingPresetId).toBeNull();
  });

  it("does not duplicate a second preset while one is being copied", async () => {
    let finish: (value: Preset) => void = () => {};
    duplicateNative.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const catalogue = await startedCatalogue();

    const duplicating = catalogue.duplicatePreset("preset-1");
    await expect(catalogue.duplicatePreset("preset-2")).resolves.toBeNull();
    finish(created);
    await duplicating;

    expect(duplicateNative).toHaveBeenCalledTimes(1);
  });

  it("tells the clinician which preset could not be copied", async () => {
    duplicateNative.mockRejectedValue(new Error("offline"));
    const catalogue = await startedCatalogue();

    await expect(catalogue.duplicatePreset("preset-1")).resolves.toBeNull();

    expect(catalogue.getSnapshot().duplicateError).toEqual({
      message: "This preset could not be duplicated. Please try again.",
      presetId: "preset-1",
    });
    expect(catalogue.getSnapshot().duplicatingPresetId).toBeNull();
  });

  it("clears the message once the clinician has read it", async () => {
    duplicateNative.mockRejectedValue(new Error("offline"));
    const catalogue = await startedCatalogue();
    await catalogue.duplicatePreset("preset-1");

    catalogue.clearDuplicateError();

    expect(catalogue.getSnapshot().duplicateError).toBeNull();
  });
});
