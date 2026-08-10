import type { Patient, Preset } from "./types";

export const preset = (overrides: Partial<Preset> = {}): Preset => ({
  id: "preset-1",
  patientId: "patient-1",
  name: "Mario Kart",
  createdAt: "0",
  mappingCount: 3,
  defaultPoseFramesJson: "[]",
  ...overrides,
});

export const patient = (overrides: Partial<Patient> = {}): Patient => ({
  id: "patient-1",
  displayName: "Alex Smith",
  clinicalNotes: null,
  createdAt: "0",
  lastActivityAtMs: 1_754_000_000_000,
  presetCount: 2,
  status: "active",
  ...overrides,
});
