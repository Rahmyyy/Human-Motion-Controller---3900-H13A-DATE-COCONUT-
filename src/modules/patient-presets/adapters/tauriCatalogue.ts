import { invokeNative, type PatientDto, type PresetDto } from "@/contracts/native";
import type { Patient, Preset } from "../types";

const toPatient = (dto: PatientDto): Patient => ({
  id: dto.id,
  displayName: dto.displayName,
  clinicalNotes: dto.clinicalNotes,
  createdAt: dto.createdAt,
  presetCount: dto.presetCount,
});

const toPreset = (dto: PresetDto): Preset => ({
  id: dto.id,
  patientId: dto.patientId,
  name: dto.name,
  createdAt: dto.createdAt,
  mappingCount: dto.mappingCount,
  defaultPoseFramesJson: dto.defaultPoseFramesJson,
});

export async function getPatients() {
  return (await invokeNative("get_patients")).map(toPatient);
}

export async function createPatient(displayName: string, clinicalNotes?: string) {
  return toPatient(
    await invokeNative("create_patient", {
      displayName,
      clinicalNotes: clinicalNotes || null,
    }),
  );
}

export async function getPatient(id: string) {
  return toPatient(await invokeNative("get_patient", { id }));
}

export async function createPreset(patientId: string, name: string) {
  return toPreset(await invokeNative("create_preset", { patientId, name }));
}

export async function updatePatient(id: string, displayName: string, clinicalNotes?: string) {
  return toPatient(
    await invokeNative("update_patient", {
      id,
      displayName,
      clinicalNotes: clinicalNotes || null,
    }),
  );
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
