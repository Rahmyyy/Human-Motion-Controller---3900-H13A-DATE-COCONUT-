import { describe, expect, it } from "vitest";
import type { Patient } from "@/modules/patient-presets";
import { countReadyPatients, getNeedsAttentionPatients } from "./patientSummary";

const patient = (overrides: Partial<Patient>): Patient => ({
  id: "patient-1",
  displayName: "Alex Smith",
  clinicalNotes: null,
  createdAt: "0",
  lastActivityAtMs: 100,
  presetCount: 1,
  status: "active",
  ...overrides,
});

describe("patient dashboard summaries", () => {
  it("counts active patients with at least one preset as ready", () => {
    const patients = [
      patient({ id: "ready" }),
      patient({ id: "no-presets", presetCount: 0 }),
      patient({ id: "review", status: "needsReview" }),
    ];

    expect(countReadyPatients(patients)).toBe(1);
  });

  it("selects needs-review patients in newest-activity order", () => {
    const patients = [
      patient({ id: "older", lastActivityAtMs: 10, status: "needsReview" }),
      patient({ id: "active", lastActivityAtMs: 30 }),
      patient({ id: "newer", lastActivityAtMs: 20, status: "needsReview" }),
    ];

    expect(getNeedsAttentionPatients(patients).map(({ id }) => id)).toEqual(["newer", "older"]);
  });
});
