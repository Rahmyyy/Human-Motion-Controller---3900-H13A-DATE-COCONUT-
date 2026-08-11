import { beforeEach, describe, expect, it, vi } from "vitest";
import { mapping } from "@/modules/movement-mapping/testMappings";
import { patient, preset } from "@/modules/patient-presets/testCatalogue";
import { createSummaryContextLoader, createSummaryContextLoaderWithDependencies } from "./summary";

const summary = {
  elapsedMs: 756_000,
  triggerCount: 31,
  triggerCountsByMapping: { "mapping-1": 18 },
};

let dependencies: {
  getPatient: ReturnType<typeof vi.fn>;
  getPreset: ReturnType<typeof vi.fn>;
  getMappings: ReturnType<typeof vi.fn>;
};

const loader = () =>
  createSummaryContextLoaderWithDependencies(
    dependencies as unknown as Parameters<typeof createSummaryContextLoaderWithDependencies>[0],
  );

async function loadedSummary() {
  const context = loader();
  await context.start("patient-1", "preset-1", summary);
  return context;
}

beforeEach(() => {
  dependencies = {
    getPatient: vi.fn().mockResolvedValue(patient()),
    getPreset: vi.fn().mockResolvedValue(preset()),
    getMappings: vi
      .fn()
      .mockResolvedValue([mapping({ id: "mapping-1" }), mapping({ id: "mapping-2" })]),
  };
});

describe("createSummaryContextLoader", () => {
  it("starts out loading, with nothing to show yet", () => {
    expect(createSummaryContextLoader().getSnapshot()).toEqual({
      context: null,
      isLoading: true,
      loadError: null,
    });
  });
});

describe("loading a finished session's summary", () => {
  it("names the patient and preset the session belonged to", async () => {
    const context = await loadedSummary();

    expect(dependencies.getPreset).toHaveBeenCalledWith("preset-1", "patient-1");
    expect(context.getSnapshot()).toMatchObject({
      isLoading: false,
      loadError: null,
      context: { patientName: "Alex Smith", presetName: "Mario Kart" },
    });
  });

  it("lists every movement the preset had, with what it triggered", async () => {
    const context = await loadedSummary();

    expect(context.getSnapshot().context?.rows).toEqual([
      { id: "mapping-1", name: "right arm raise", keybind: "Spacebar", triggerCount: 18 },
      { id: "mapping-2", name: "right arm raise", keybind: "Spacebar", triggerCount: 0 },
    ]);
  });

  it("shows a session that used no movements at all", async () => {
    dependencies.getMappings.mockResolvedValue([]);
    const context = await loadedSummary();

    expect(context.getSnapshot().context?.rows).toEqual([]);
  });

  it("tells the clinician when the summary could not be put together", async () => {
    dependencies.getPatient.mockRejectedValue(new Error("offline"));
    const context = await loadedSummary();

    expect(context.getSnapshot()).toEqual({
      context: null,
      isLoading: false,
      loadError: "offline",
    });
  });

  it("describes a failure that was not thrown as an error", async () => {
    dependencies.getPreset.mockRejectedValue("no preset");
    const context = await loadedSummary();

    expect(context.getSnapshot().loadError).toBe("no preset");
  });

  it("ignores a load that a newer one has overtaken", async () => {
    dependencies.getPatient.mockResolvedValueOnce(patient({ displayName: "Stale Patient" }));
    const context = loader();

    await Promise.all([
      context.start("patient-1", "preset-1", summary),
      context.start("patient-2", "preset-1", summary),
    ]);

    expect(context.getSnapshot().context?.patientName).toBe("Alex Smith");
  });

  it("ignores a failed load that a newer one has overtaken", async () => {
    dependencies.getPatient.mockRejectedValueOnce(new Error("offline"));
    const context = loader();

    await Promise.all([
      context.start("patient-1", "preset-1", summary),
      context.start("patient-2", "preset-1", summary),
    ]);

    expect(context.getSnapshot().loadError).toBeNull();
  });

  it("ignores a load that finishes after the summary has closed", async () => {
    const context = loader();

    const loading = context.start("patient-1", "preset-1", summary);
    context.dispose();
    await loading;

    expect(context.getSnapshot().context).toBeNull();
  });

  it("tells its listeners as the summary loads", async () => {
    const context = loader();
    const listener = vi.fn();
    context.subscribe(listener);

    await context.start("patient-1", "preset-1", summary);

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("stops telling a listener that has unsubscribed", async () => {
    const context = loader();
    const listener = vi.fn();

    context.subscribe(listener)();
    await context.start("patient-1", "preset-1", summary);

    expect(listener).not.toHaveBeenCalled();
  });
});
