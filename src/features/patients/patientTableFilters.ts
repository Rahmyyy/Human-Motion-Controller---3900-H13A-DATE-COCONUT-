import type { Patient, PatientStatus } from "@/modules/patient-presets";

export type PatientStatusFilter = "all" | PatientStatus;
export type ActivityRange = "allTime" | "sevenDays" | "thirtyDays" | "previousMonth" | "lastYear";

export interface PatientTableFilter {
  activityRange: ActivityRange;
  nowMs: number;
  search: string;
  status: PatientStatusFilter;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function filterPatients(patients: Patient[], filter: PatientTableFilter) {
  const query = filter.search.trim().toLocaleLowerCase();

  return patients
    .filter((patient) => {
      const matchesSearch =
        !query ||
        patient.displayName.toLocaleLowerCase().includes(query) ||
        patient.clinicalNotes?.toLocaleLowerCase().includes(query);
      if (!matchesSearch) return false;

      const matchesStatus = filter.status === "all" || patient.status === filter.status;
      const activityBounds = activityRangeBounds(filter.activityRange, filter.nowMs);
      const matchesActivity =
        !activityBounds ||
        (patient.lastActivityAtMs >= activityBounds[0] &&
          patient.lastActivityAtMs <= activityBounds[1]);
      return matchesStatus && matchesActivity;
    })
    .sort((left, right) => right.lastActivityAtMs - left.lastActivityAtMs);
}

export function activityRangeBounds(range: ActivityRange, nowMs: number): [number, number] | null {
  if (range === "allTime") return null;
  if (range === "sevenDays") return [nowMs - 7 * DAY_MS, nowMs];
  if (range === "thirtyDays") return [nowMs - 30 * DAY_MS, nowMs];
  if (range === "lastYear") return [nowMs - 365 * DAY_MS, nowMs];

  const now = new Date(nowMs);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  return [previousMonthStart, currentMonthStart - 1];
}
