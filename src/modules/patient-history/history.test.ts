import { describe, expect, it } from "vitest";
import { createPatientHistoryWithDependencies } from "./history";
import { session } from "./testSessions";
import { ALL_PRESETS } from "./types";

describe("patient history lifecycle", () => {
  it("resets the preset filter when switching patients but preserves the date range", async () => {
    const sessionsByPatient = {
      patientA: [session({ id: "session-a", presetId: "preset-a" })],
      patientB: [session({ id: "session-b", presetId: "preset-b" })],
    };
    const history = createPatientHistoryWithDependencies({
      loadSessions: async (patientId) =>
        sessionsByPatient[patientId as keyof typeof sessionsByPatient] ?? [],
      loadPatient: async (patientId) => ({ displayName: patientId }),
      now: () => Date.now(),
    });

    await history.start("patientA");
    history.setDateRange("all");
    history.setPresetId("preset-a");

    await history.start("patientB");

    expect(history.getSnapshot().filter).toEqual({
      dateRange: "all",
      presetId: ALL_PRESETS,
    });
    expect(history.getSnapshot().sessions.map(({ id }) => id)).toEqual(["session-b"]);
  });

  it("preserves the preset filter when retrying the same patient", async () => {
    const history = createPatientHistoryWithDependencies({
      loadSessions: async () => [session({ presetId: "preset-a" })],
      loadPatient: async () => ({ displayName: "Patient A" }),
      now: () => Date.now(),
    });

    await history.start("patientA");
    history.setPresetId("preset-a");
    await history.retry();

    expect(history.getSnapshot().filter.presetId).toBe("preset-a");
  });
});
