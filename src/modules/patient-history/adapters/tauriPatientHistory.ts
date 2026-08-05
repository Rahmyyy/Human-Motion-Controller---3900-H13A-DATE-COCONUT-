import {
  invokeNative,
  type PatientSessionDto,
  type SessionMappingStatDto,
} from "@/contracts/native";
import type { PatientSession, SessionMappingStat } from "../types";

const toMappingStat = (dto: SessionMappingStatDto): SessionMappingStat => ({
  mappingId: dto.mappingId,
  mappingName: dto.mappingName,
  keybind: dto.keybind,
  thresholdPercentage: dto.thresholdPercentage,
  keypressTriggerThresholdPercentage: dto.keypressTriggerThresholdPercentage,
  triggerCount: dto.triggerCount,
});

const toPatientSession = (dto: PatientSessionDto): PatientSession => ({
  id: dto.id,
  presetId: dto.presetId,
  presetName: dto.presetName,
  startedAtMs: dto.startedAtMs,
  durationMs: dto.durationMs,
  triggerCount: dto.triggerCount,
  mappings: dto.mappings.map(toMappingStat),
});

export async function getPatientSessions(patientId: string) {
  return (await invokeNative("get_patient_sessions", { patientId })).map(toPatientSession);
}
