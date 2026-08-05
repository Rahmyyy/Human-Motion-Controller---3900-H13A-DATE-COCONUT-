import {
  invokeNative,
  type ImportedPatientSummaryDto,
  type PatientDto,
  type PresetDto,
} from "@/contracts/native";
import type { ImportedPatientSummary, Patient, PatientStatus, Preset } from "../types";

const toPatient = (dto: PatientDto): Patient => ({
  id: dto.id,
  displayName: dto.displayName,
  clinicalNotes: dto.clinicalNotes,
  createdAt: dto.createdAt,
  presetCount: dto.presetCount,
  status: dto.status,
  lastActivityAtMs: dto.lastActivityAtMs,
});

const toPreset = (dto: PresetDto): Preset => ({
  id: dto.id,
  patientId: dto.patientId,
  name: dto.name,
  createdAt: dto.createdAt,
  mappingCount: dto.mappingCount,
  defaultPoseFramesJson: dto.defaultPoseFramesJson,
});

const toImportedPatientSummary = (dto: ImportedPatientSummaryDto): ImportedPatientSummary => ({
  id: dto.id,
  displayName: dto.displayName,
});

export async function getPatients() {
  return (await invokeNative("get_patients")).map(toPatient);
}

export async function createPatient(
  displayName: string,
  clinicalNotes?: string,
  status: PatientStatus = "active",
) {
  return toPatient(
    await invokeNative("create_patient", {
      displayName,
      clinicalNotes: clinicalNotes || null,
      status,
    }),
  );
}

export async function getPatient(id: string) {
  return toPatient(await invokeNative("get_patient", { id }));
}

export function exportPatient(patientId: string, filePath: string) {
  return invokeNative("export_patient", { patientId, filePath });
}

export function previewImportPatient(filePath: string) {
  return invokeNative("preview_import_patient", { filePath });
}

export async function importPatient(filePath: string) {
  return toImportedPatientSummary(await invokeNative("import_patient", { filePath }));
}

export async function createPreset(patientId: string, name: string) {
  return toPreset(await invokeNative("create_preset", { patientId, name }));
}

export async function updatePatient(
  id: string,
  displayName: string,
  clinicalNotes: string | undefined,
  status: PatientStatus,
) {
  return toPatient(
    await invokeNative("update_patient", {
      id,
      displayName,
      clinicalNotes: clinicalNotes || null,
      status,
    }),
  );
}

export function touchPatientActivity(patientId: string) {
  return invokeNative("touch_patient_activity", { patientId });
}

export function deletePatient(id: string) {
  return invokeNative("delete_patient", { id });
}

export async function getPreset(id: string, patientId: string) {
  return toPreset(await invokeNative("get_preset", { id, patientId }));
}

export async function getPresets(patientId: string) {
  return (await invokeNative("get_presets", { patientId })).map(toPreset);
}

export async function updateDefaultPose(
  id: string,
  patientId: string,
  defaultPoseFramesJson: string,
) {
  return toPreset(
    await invokeNative("update_default_pose", { id, patientId, defaultPoseFramesJson }),
  );
}

export async function duplicatePreset(id: string) {
  return toPreset(await invokeNative("duplicate_preset", { id }));
}

export function deletePreset(id: string) {
  return invokeNative("delete_preset", { id });
}
