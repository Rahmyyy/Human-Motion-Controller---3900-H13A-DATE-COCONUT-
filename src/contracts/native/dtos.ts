export const PRESS_TYPES = ["Toggle", "Press", "Release", "Click"] as const;

export type PressTypeDto = (typeof PRESS_TYPES)[number];
export type PatientStatusDto = "active" | "needsReview";

export interface PatientDto {
  id: string;
  displayName: string;
  clinicalNotes: string | null;
  createdAt: string;
  presetCount: number;
  status: PatientStatusDto;
  lastActivityAtMs: number;
}

export interface ScheduledSessionDto {
  id: string;
  patientId: string;
  patientDisplayName: string;
  scheduledAtMs: number;
}

export interface DashboardOverviewDto {
  activePatientCount: number;
  sessionsTodayCount: number;
  todaysSchedule: ScheduledSessionDto[];
}

export interface PresetDto {
  id: string;
  patientId: string;
  name: string;
  createdAt: string;
  mappingCount: number;
  defaultPoseFramesJson: string | null;
}

export interface MovementMappingSummaryDto {
  id: string;
  name: string;
  keybind: string;
  keypressType: PressTypeDto;
  poseFramesJson: string;
  selectedLandmarks: number[];
  thresholdPercentage: number;
  keypressTriggerThresholdPercentage: number;
}

export interface MovementMappingDetailsDto extends MovementMappingSummaryDto {
  presetId: string;
}

export interface CreateMovementMappingArgs {
  presetId: string;
  name: string;
  keybind: string;
  keypressType: PressTypeDto;
  poseFramesJson: string;
  selectedLandmarks: number[];
  keypressTriggerThresholdPercentage: number;
}

export interface UpdateMovementMappingArgs extends CreateMovementMappingArgs {
  id: string;
}

export interface SessionSummaryDto {
  elapsedMs: number;
  triggerCount: number;
  triggerCountsByMapping: Record<string, number>;
}

/**
 * A session the overlay has just finished, on its way into the patient's history. The preset
 * name and mapping settings are not carried here; they are snapshotted natively.
 */
export interface CompletedSessionDto {
  sessionId: string;
  patientId: string;
  presetId: string;
  startedAtMs: number;
  endedAtMs: number;
  triggerCountsByMapping: Record<string, number>;
}

/** One mapping's frozen settings and activity within a completed session. */
export interface SessionMappingStatDto {
  mappingId: string;
  mappingName: string;
  keybind: string;
  thresholdPercentage: number;
  keypressTriggerThresholdPercentage: number;
  triggerCount: number;
}

/** A completed session as the patient history page reads it back. */
export interface PatientSessionDto {
  id: string;
  presetId: string;
  presetName: string;
  startedAtMs: number;
  durationMs: number;
  triggerCount: number;
  mappings: SessionMappingStatDto[];
}

export interface NativeErrorDto {
  code: string;
  message: string;
}
