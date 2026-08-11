import type { Patient } from "@/modules/patient-presets";

export const patient = (overrides: Partial<Patient> = {}): Patient => ({
  id: "patient-1",
  displayName: "Alex Smith",
  clinicalNotes: null,
  createdAt: "0",
  lastActivityAtMs: new Date(2026, 7, 9).getTime(),
  presetCount: 2,
  status: "active",
  ...overrides,
});
