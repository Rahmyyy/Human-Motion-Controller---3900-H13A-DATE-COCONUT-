import {
  invokeNative,
  type MovementMappingDetailsDto,
  type MovementMappingSummaryDto,
} from "@/contracts/native";
import type {
  CreateMovementMappingInput,
  MovementMapping,
  MovementMappingDetails,
  MovementMappingRepository,
  UpdateMovementMappingInput,
} from "../types";

const toMapping = (dto: MovementMappingSummaryDto): MovementMapping => ({ ...dto });
const toDetails = (dto: MovementMappingDetailsDto): MovementMappingDetails => ({ ...dto });

export const tauriMovementMappings: MovementMappingRepository = {
  async create(input: CreateMovementMappingInput) {
    await invokeNative("create_movement_mapping", input);
  },
  async list(presetId: string) {
    return (await invokeNative("get_movement_mappings", { presetId })).map(toMapping);
  },
  async get(id: string, presetId: string) {
    return toDetails(await invokeNative("get_movement_mapping", { id, presetId }));
  },
  async update(input: UpdateMovementMappingInput) {
    await invokeNative("update_movement_mapping", input);
  },
  async delete(id: string, presetId: string) {
    await invokeNative("delete_movement_mapping", { id, presetId });
  },
  async updateThreshold(id: string, presetId: string, thresholdPercentage: number) {
    await invokeNative("update_movement_mapping_threshold", {
      id,
      presetId,
      thresholdPercentage,
    });
  },
};

export const getMovementMappings = (presetId: string) => tauriMovementMappings.list(presetId);
export const getMovementMapping = (id: string, presetId: string) =>
  tauriMovementMappings.get(id, presetId);
