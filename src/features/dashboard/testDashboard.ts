import type { Patient } from "@/modules/patient-presets";
import type { DashboardOverview } from "@/modules/scheduling";

export const patient = (overrides: Partial<Patient> = {}): Patient => ({
  id: "patient-1",
  displayName: "Alex Smith",
  clinicalNotes: null,
  createdAt: "0",
  lastActivityAtMs: 0,
  presetCount: 1,
  status: "active",
  ...overrides,
});

export const dashboardOverview: DashboardOverview = {
  activePatientCount: 4,
  sessionsTodayCount: 2,
  todaysSchedule: [
    { id: "session-1", patientId: "patient-9", patientDisplayName: "Sam Diaz", scheduledAtMs: 0 },
  ],
};
