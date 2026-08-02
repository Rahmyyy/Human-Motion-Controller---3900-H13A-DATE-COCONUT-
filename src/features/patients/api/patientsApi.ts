import { invoke } from "@tauri-apps/api/core";

export type Patient = {
  id: string;
  displayName: string;
  clinicalNotes?: string | null;
  createdAt: string;
};

export function getPatients() {
  return invoke<Patient[]>("get_patients");
}

export function createPatient(displayName: string, clinicalNotes?: string) {
  return invoke<Patient>("create_patient", {
    displayName,
    clinicalNotes: clinicalNotes || null,
  });
}

export function getPatient(id: string) {
  return invoke<Patient>("get_patient", { id });
}
