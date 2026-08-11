import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPreset as createPresetNative,
  deletePreset as deletePresetNative,
  duplicatePreset as duplicatePresetNative,
  getPresets,
} from "./adapters/tauriCatalogue";
import { createPresetSelectionService } from "./catalogue";
import { preset } from "./testCatalogue";

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

describe("deleting a preset", () => {
  it("removes it from the list", async () => {
    const catalogue = await startedCatalogue();

    await expect(catalogue.deletePreset("preset-1")).resolves.toBe(true);

    expect(deleteNative).toHaveBeenCalledWith("preset-1");
    expect(presetIds(catalogue)).toEqual(["preset-2"]);
  });

  it("closes the preset it was showing", async () => {
    const catalogue = await startedCatalogue();
    catalogue.selectPreset("preset-1");

    await catalogue.deletePreset("preset-1");

    expect(catalogue.getSnapshot().selectedPresetId).toBeNull();
  });

  it("leaves a different open preset alone", async () => {
    const catalogue = await startedCatalogue();
    catalogue.selectPreset("preset-2");

    await catalogue.deletePreset("preset-1");

    expect(catalogue.getSnapshot().selectedPreset).toEqual(chess);
  });

  it("does not delete a second preset while one is being deleted", async () => {
    let finish = () => {};
    deleteNative.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    const catalogue = await startedCatalogue();

    const deleting = catalogue.deletePreset("preset-1");
    await expect(catalogue.deletePreset("preset-2")).resolves.toBe(false);
    finish();
    await deleting;

    expect(deleteNative).toHaveBeenCalledTimes(1);
  });

  it("tells the clinician which preset could not be deleted", async () => {
    deleteNative.mockRejectedValue(new Error("offline"));
    const catalogue = await startedCatalogue();

    await expect(catalogue.deletePreset("preset-1")).resolves.toBe(false);

    expect(catalogue.getSnapshot().deleteError).toEqual({
      message: "This preset could not be deleted. Please try again.",
      presetId: "preset-1",
    });
    expect(presetIds(catalogue)).toEqual(["preset-1", "preset-2"]);
  });

  it("clears the message once the clinician has read it", async () => {
    deleteNative.mockRejectedValue(new Error("offline"));
    const catalogue = await startedCatalogue();
    await catalogue.deletePreset("preset-1");

    catalogue.clearDeleteError();

    expect(catalogue.getSnapshot().deleteError).toBeNull();
  });
});
