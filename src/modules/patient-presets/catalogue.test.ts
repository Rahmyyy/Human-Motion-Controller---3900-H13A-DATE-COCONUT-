import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPresets } from "./adapters/tauriCatalogue";
import { createPresetSelectionService } from "./catalogue";
import { preset } from "./testCatalogue";

vi.mock("./adapters/tauriCatalogue", () => ({
  getPresets: vi.fn(),
  createPreset: vi.fn(),
  duplicatePreset: vi.fn(),
  deletePreset: vi.fn(),
}));

const loadPresets = vi.mocked(getPresets);
const kart = preset({ id: "preset-1", name: "Mario Kart" });
const chess = preset({ id: "preset-2", name: "Chess" });

async function startedCatalogue() {
  const catalogue = createPresetSelectionService();
  await catalogue.start("patient-1");
  return catalogue;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  loadPresets.mockResolvedValue([kart, chess]);
});

describe("createPresetSelectionService", () => {
  it("starts loading, with nothing to show yet", () => {
    expect(createPresetSelectionService().getSnapshot()).toEqual({
      createError: null,
      deleteError: null,
      deletingPresetId: null,
      duplicateError: null,
      duplicatingPresetId: null,
      error: null,
      isCreating: false,
      isLoading: true,
      presets: [],
      selectedPreset: null,
      selectedPresetId: null,
    });
  });

  it("loads the patient's presets", async () => {
    const catalogue = await startedCatalogue();

    expect(loadPresets).toHaveBeenCalledWith("patient-1");
    expect(catalogue.getSnapshot().presets).toEqual([kart, chess]);
    expect(catalogue.getSnapshot().isLoading).toBe(false);
  });

  it("tells the clinician when the patient was not given", async () => {
    const catalogue = createPresetSelectionService();

    await catalogue.start(undefined);

    expect(catalogue.getSnapshot()).toMatchObject({
      error: "Patient not found.",
      isLoading: false,
    });
    expect(loadPresets).not.toHaveBeenCalled();
  });

  it("tells the clinician when the presets could not be loaded", async () => {
    loadPresets.mockRejectedValue(new Error("offline"));
    const catalogue = createPresetSelectionService();

    await catalogue.start("patient-1");

    expect(catalogue.getSnapshot()).toMatchObject({
      error: "Failed to load presets.",
      isLoading: false,
    });
  });

  it("ignores a load that a newer one has overtaken", async () => {
    loadPresets.mockResolvedValueOnce([kart]);
    const catalogue = createPresetSelectionService();

    await Promise.all([catalogue.start("patient-1"), catalogue.start("patient-2")]);

    expect(catalogue.getSnapshot().presets).toEqual([kart, chess]);
  });

  it("ignores a failed load that a newer one has overtaken", async () => {
    loadPresets.mockRejectedValueOnce(new Error("offline"));
    const catalogue = createPresetSelectionService();

    await Promise.all([catalogue.start("patient-1"), catalogue.start("patient-2")]);

    expect(catalogue.getSnapshot().error).toBeNull();
  });

  it("ignores a load that finishes after the page has gone", async () => {
    const catalogue = createPresetSelectionService();

    const loading = catalogue.start("patient-1");
    catalogue.dispose();
    await loading;

    expect(catalogue.getSnapshot().presets).toEqual([]);
  });

  it("stops telling a listener that has unsubscribed", async () => {
    const catalogue = createPresetSelectionService();
    const listener = vi.fn();

    catalogue.subscribe(listener)();
    await catalogue.start("patient-1");

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("choosing a preset", () => {
  it("selects the preset the clinician picked", async () => {
    const catalogue = await startedCatalogue();

    catalogue.selectPreset("preset-2");

    expect(catalogue.getSnapshot().selectedPresetId).toBe("preset-2");
    expect(catalogue.getSnapshot().selectedPreset).toEqual(chess);
  });

  /** Picking the open preset again closes it, so the same control does both. */
  it("deselects the preset when it is picked again", async () => {
    const catalogue = await startedCatalogue();
    catalogue.selectPreset("preset-2");

    catalogue.selectPreset("preset-2");

    expect(catalogue.getSnapshot().selectedPresetId).toBeNull();
    expect(catalogue.getSnapshot().selectedPreset).toBeNull();
  });

  it("switches straight from one preset to another", async () => {
    const catalogue = await startedCatalogue();
    catalogue.selectPreset("preset-1");

    catalogue.selectPreset("preset-2");

    expect(catalogue.getSnapshot().selectedPreset).toEqual(chess);
  });

  it("keeps the selection through a reload of the same presets", async () => {
    const catalogue = await startedCatalogue();
    catalogue.selectPreset("preset-2");

    await catalogue.start("patient-1");

    expect(catalogue.getSnapshot().selectedPreset).toEqual(chess);
  });

  it("has no preset to select that the patient does not have", async () => {
    const catalogue = await startedCatalogue();

    catalogue.selectPreset("missing");

    expect(catalogue.getSnapshot().selectedPreset).toBeNull();
  });
});
