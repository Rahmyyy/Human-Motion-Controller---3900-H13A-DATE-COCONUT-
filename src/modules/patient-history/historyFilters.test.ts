import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { createPatientHistoryWithDependencies } from "./history";
import { localTime, session } from "./testSessions";
import { ALL_PRESETS, type PatientSession } from "./types";

const NOW = localTime(2026, 7, 10, 12, 0);

const recent = session({ id: "recent", presetId: "preset-1", startedAtMs: localTime(2026, 7, 4) });
const older = session({
  id: "older",
  presetId: "preset-2",
  presetName: "chess",
  startedAtMs: localTime(2026, 1, 4),
});

let dependencies: {
  loadSessions: Mock<(patientId: string) => Promise<PatientSession[]>>;
  loadPatient: Mock<(patientId: string) => Promise<{ displayName: string }>>;
  now: Mock<() => number>;
};

const history = () => createPatientHistoryWithDependencies(dependencies);

async function loadedHistory(patientId = "patient-1") {
  const page = history();
  await page.start(patientId);
  return page;
}

const sessionIds = (page: Awaited<ReturnType<typeof loadedHistory>>) =>
  page.getSnapshot().sessions.map((entry) => entry.id);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  dependencies = {
    loadSessions: vi.fn(() => Promise.resolve([recent, older])),
    loadPatient: vi.fn(() => Promise.resolve({ displayName: "Alex Smith" })),
    now: vi.fn(() => NOW),
  };
});

describe("filtering a patient's history", () => {
  it("widens the range to show older sessions", async () => {
    const page = await loadedHistory();

    page.setDateRange("all");

    expect(sessionIds(page)).toEqual(["recent", "older"]);
  });

  it("narrows to one preset", async () => {
    const page = await loadedHistory();
    page.setDateRange("all");

    page.setPresetId("preset-2");

    expect(sessionIds(page)).toEqual(["older"]);
  });

  it("repaints the page once per filter change", async () => {
    const page = await loadedHistory();
    const listener = vi.fn();
    page.subscribe(listener);

    page.setDateRange("all");

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps the filter through a reload of the same patient", async () => {
    const page = await loadedHistory();
    page.setPresetId("preset-2");

    await page.start("patient-1");

    expect(page.getSnapshot().filter.presetId).toBe("preset-2");
  });

  /** Another patient will not have that preset, so the filter would hide everything. */
  it("keeps the preset filter when the clinician retries", async () => {
    const page = await loadedHistory();
    page.setPresetId("preset-2");

    await page.retry();

    expect(page.getSnapshot().filter.presetId).toBe("preset-2");
  });

  /** Another patient will not have that preset, so the filter would hide everything. */
  it("clears the preset filter when a different patient is opened", async () => {
    const page = await loadedHistory();
    page.setPresetId("preset-2");

    await page.start("patient-2");

    expect(page.getSnapshot().filter.presetId).toBe(ALL_PRESETS);
  });

  it("keeps the chosen date range when a different patient is opened", async () => {
    const page = await loadedHistory();
    page.setDateRange("all");

    await page.start("patient-2");

    expect(page.getSnapshot().filter.dateRange).toBe("all");
  });
});
