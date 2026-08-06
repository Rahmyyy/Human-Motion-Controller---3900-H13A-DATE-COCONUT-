import { describe, expect, it } from "vitest";
import type { Patient } from "@/modules/patient-presets";
import { activityRangeBounds, filterPatients, type ActivityRange } from "./patientTableFilters";

const now = new Date(2026, 7, 5, 12).getTime();

const patient = (overrides: Partial<Patient>): Patient => ({
  id: "patient-1",
  displayName: "Alex Smith",
  clinicalNotes: "Stroke rehabilitation",
  createdAt: "0",
  presetCount: 2,
  status: "active",
  lastActivityAtMs: now,
  ...overrides,
});

describe("filterPatients", () => {
  it("searches names and clinical notes case-insensitively", () => {
    const patients = [
      patient({ id: "1" }),
      patient({ id: "2", displayName: "Taylor", clinicalNotes: "Knee care" }),
    ];

    expect(filterPatients(patients, filter({ search: "SMITH" })).map(({ id }) => id)).toEqual([
      "1",
    ]);
    expect(filterPatients(patients, filter({ search: "knee" })).map(({ id }) => id)).toEqual(["2"]);
  });

  it("filters needs-review patients and combines the search query", () => {
    const patients = [
      patient({ id: "1", status: "needsReview" }),
      patient({ id: "2", displayName: "Taylor", status: "needsReview" }),
      patient({ id: "3", status: "active" }),
    ];

    expect(
      filterPatients(patients, filter({ status: "needsReview", search: "alex" })).map(
        ({ id }) => id,
      ),
    ).toEqual(["1"]);
  });

  it("filters active patients independently", () => {
    const patients = [
      patient({ id: "active", status: "active" }),
      patient({ id: "review", status: "needsReview" }),
    ];

    expect(filterPatients(patients, filter({ status: "active" })).map(({ id }) => id)).toEqual([
      "active",
    ]);
  });

  it("shows every activity date for all time", () => {
    const patients = [
      patient({ id: "old", lastActivityAtMs: 1 }),
      patient({ id: "new", lastActivityAtMs: now }),
    ];

    expect(
      filterPatients(patients, filter({ activityRange: "allTime" })).map(({ id }) => id),
    ).toEqual(["new", "old"]);
  });

  it.each<ActivityRange>(["sevenDays", "thirtyDays", "previousMonth", "lastYear"])(
    "applies the %s activity range",
    (activityRange) => {
      const [startMs, endMs] = activityRangeBounds(activityRange, now)!;
      const patients = [
        patient({ id: "inside", lastActivityAtMs: startMs }),
        patient({ id: "after", lastActivityAtMs: endMs + 1 }),
        patient({ id: "before", lastActivityAtMs: startMs - 1 }),
      ];

      expect(filterPatients(patients, filter({ activityRange })).map(({ id }) => id)).toEqual([
        "inside",
      ]);
    },
  );

  it("combines status, activity, and search filters", () => {
    const patients = [
      patient({ id: "match", status: "needsReview", lastActivityAtMs: now }),
      patient({ id: "wrong-status", status: "active", lastActivityAtMs: now }),
      patient({ id: "too-old", status: "needsReview", lastActivityAtMs: 1 }),
      patient({ id: "wrong-name", displayName: "Taylor", status: "needsReview" }),
    ];

    expect(
      filterPatients(
        patients,
        filter({ activityRange: "sevenDays", search: "alex", status: "needsReview" }),
      ).map(({ id }) => id),
    ).toEqual(["match"]);
  });

  it("orders results by newest activity", () => {
    const patients = [
      patient({ id: "older", lastActivityAtMs: 1 }),
      patient({ id: "newer", lastActivityAtMs: 2 }),
    ];

    expect(filterPatients(patients, filter({})).map(({ id }) => id)).toEqual(["newer", "older"]);
  });
});

function filter(overrides: Partial<Parameters<typeof filterPatients>[1]>) {
  return {
    activityRange: "allTime" as const,
    nowMs: now,
    search: "",
    status: "all" as const,
    ...overrides,
  };
}
