import { describe, expect, it, vi } from "vitest";
import { createPatientHistory } from "./history";
import { ALL_PRESETS } from "./types";

describe("createPatientHistory", () => {
  it("starts out loading, with nothing to show yet", () => {
    expect(createPatientHistory().getSnapshot()).toMatchObject({
      error: null,
      isLoading: true,
      patientName: null,
      filter: { dateRange: "30d", presetId: ALL_PRESETS },
      sessions: [],
      totalSessionCount: 0,
    });
  });

  /** Outside the app there is no native store to read from, so the load reports its failure. */
  it("reads its sessions from the native store", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const page = createPatientHistory();

    await page.start("patient-1");

    expect(page.getSnapshot()).toMatchObject({
      error: "Could not load this patient's history.",
      isLoading: false,
    });
  });
});
