import {
  keypressTriggerThresholdFromPercentage,
  type MovementMapping,
} from "@/modules/movement-mapping";
import { selectAcceptedMatch } from "./selectAcceptedMatch";
import type { RecognitionMappingStatus, RecognitionMatch } from "../types";

export function buildMappingStatuses(
  mappings: MovementMapping[],
  matches: RecognitionMatch[],
  defaultPoseConfidence = 0,
  canActivate = true,
): RecognitionMappingStatus[] {
  const matchesById = new Map(matches.map((match) => [match.id, match]));
  const acceptedMatchId = canActivate
    ? selectAcceptedMatch(matches, defaultPoseConfidence)?.id
    : undefined;

  return mappings.map((mapping) => {
    const match = matchesById.get(mapping.id);
    const confidence = match?.confidence ?? 0;

    return {
      id: mapping.id,
      name: mapping.name,
      keybind: mapping.keybind,
      keypressType: mapping.keypressType,
      confidence,
      keypressTriggerThreshold:
        match?.keypressTriggerThreshold ??
        keypressTriggerThresholdFromPercentage(mapping.keypressTriggerThresholdPercentage),
      isActive: mapping.id === acceptedMatchId,
    };
  });
}
