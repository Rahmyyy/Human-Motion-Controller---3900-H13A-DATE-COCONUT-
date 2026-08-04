import type {
  CreateMovementMappingArgs,
  MovementMappingDetailsDto,
  MovementMappingSummaryDto,
  PatientDto,
  PresetDto,
  PressTypeDto,
  SessionSummaryDto,
  UpdateMovementMappingArgs,
} from "./dtos";

type Command<Args, Result> = {
  args: Args;
  result: Result;
};

/** Stable Tauri command names and the exact values crossing the frontend/native seam. */
export interface NativeCommandMap {
  get_patients: Command<undefined, PatientDto[]>;
  create_patient: Command<{ displayName: string; clinicalNotes: string | null }, PatientDto>;
  get_patient: Command<{ id: string }, PatientDto>;

  create_preset: Command<{ patientId: string; name: string }, PresetDto>;
  get_preset: Command<{ id: string; patientId: string }, PresetDto>;
  get_presets: Command<{ patientId: string }, PresetDto[]>;
  update_default_pose: Command<
    { id: string; patientId: string; defaultPoseFramesJson: string },
    PresetDto
  >;
  duplicate_preset: Command<{ id: string }, PresetDto>;
  delete_preset: Command<{ id: string }, void>;

  create_movement_mapping: Command<CreateMovementMappingArgs, void>;
  get_movement_mappings: Command<{ presetId: string }, MovementMappingSummaryDto[]>;
  get_movement_mapping: Command<{ id: string; presetId: string }, MovementMappingDetailsDto>;
  update_movement_mapping: Command<UpdateMovementMappingArgs, void>;
  update_movement_mapping_threshold: Command<
    { id: string; presetId: string; thresholdPercentage: number },
    void
  >;
  delete_movement_mapping: Command<{ id: string; presetId: string }, void>;

  press_key: Command<{ key: string }, void>;
  execute_action: Command<{ key: string; pressType: PressTypeDto }, void>;
  open_overlay: Command<{ patientId: string; presetId: string; sessionId: string }, void>;
  close_overlay: Command<{ sessionId: string; summary: SessionSummaryDto }, void>;
}

export type NativeCommandName = keyof NativeCommandMap;
export type NativeCommandArgs<K extends NativeCommandName> = NativeCommandMap[K]["args"];
export type NativeCommandResult<K extends NativeCommandName> = NativeCommandMap[K]["result"];
