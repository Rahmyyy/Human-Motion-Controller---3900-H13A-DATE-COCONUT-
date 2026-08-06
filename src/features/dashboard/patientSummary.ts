import type { Patient } from "@/modules/patient-presets";

export function countReadyPatients(patients: Patient[]) {
  return patients.filter((patient) => patient.status === "active" && patient.presetCount > 0)
    .length;
}

export function getNeedsAttentionPatients(patients: Patient[]) {
  return patients
    .filter((patient) => patient.status === "needsReview")
    .sort((left, right) => right.lastActivityAtMs - left.lastActivityAtMs);
}
