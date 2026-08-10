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

describe("loading a patient's history", () => {
  it("names the patient and shows the sessions inside the default range", async () => {
    const page = await loadedHistory();

    expect(dependencies.loadSessions).toHaveBeenCalledWith("patient-1");
    expect(page.getSnapshot()).toMatchObject({
      isLoading: false,
      error: null,
      patientName: "Alex Smith",
      totalSessionCount: 2,
    });
    expect(sessionIds(page)).toEqual(["recent"]);
  });

  /** Every preset the patient has used, including ones outside the current date range. */
  it("offers every preset the patient has ever used as a filter", async () => {
    const page = await loadedHistory();

    expect(page.getSnapshot().presetOptions.map((option) => option.id)).toEqual([
      ALL_PRESETS,
      "preset-2",
      "preset-1",
    ]);
  });

  it("summarises and charts the sessions in range", async () => {
    const page = await loadedHistory();

    expect(page.getSnapshot().summary.completedSessions).toBe(1);
    expect(page.getSnapshot().activity.points).toHaveLength(1);
    expect(page.getSnapshot().presetUsage.topPresetName).toBe("mario kart");
  });

  it("tells the clinician when the history could not be loaded", async () => {
    dependencies.loadSessions.mockRejectedValue(new Error("offline"));

    const page = await loadedHistory();

    expect(page.getSnapshot()).toMatchObject({
      error: "Could not load this patient's history.",
      isLoading: false,
      sessions: [],
      patientName: "Alex Smith",
    });
  });

  /** The charts read fine without the patient's name, so a failed name lookup is not fatal. */
  it("still shows the charts when the patient's name could not be read", async () => {
    dependencies.loadPatient.mockRejectedValue(new Error("offline"));

    const page = await loadedHistory();

    expect(page.getSnapshot().patientName).toBeNull();
    expect(sessionIds(page)).toEqual(["recent"]);
  });

  it("tells the clinician when no patient was given", async () => {
    const page = history();

    await page.start(undefined);

    expect(page.getSnapshot()).toMatchObject({
      error: "Patient not found.",
      isLoading: false,
      sessions: [],
    });
    expect(dependencies.loadSessions).not.toHaveBeenCalled();
  });

  it("ignores a load that a newer one has overtaken", async () => {
    dependencies.loadSessions.mockResolvedValueOnce([older]);
    const page = history();

    await Promise.all([page.start("patient-1"), page.start("patient-2")]);

    expect(page.getSnapshot().totalSessionCount).toBe(2);
  });

  it("ignores a load that finishes after the page has gone", async () => {
    const page = history();

    const loading = page.start("patient-1");
    page.dispose();
    await loading;

    expect(page.getSnapshot().totalSessionCount).toBe(0);
  });

  it("reloads the same patient when the clinician retries", async () => {
    dependencies.loadSessions.mockRejectedValueOnce(new Error("offline"));
    const page = await loadedHistory();

    await page.retry();

    expect(page.getSnapshot().error).toBeNull();
    expect(sessionIds(page)).toEqual(["recent"]);
  });

  it("has no patient to retry when none was given", async () => {
    const page = history();
    await page.start(undefined);

    await page.retry();

    expect(page.getSnapshot().error).toBe("Patient not found.");
  });

  it("stops telling a listener that has unsubscribed", async () => {
    const page = history();
    const listener = vi.fn();

    page.subscribe(listener)();
    await page.start("patient-1");

    expect(listener).not.toHaveBeenCalled();
  });
});
