import type { PresetMappingCardData } from "@/features/preset-mapping/types";
import { selectAcceptedMatch } from "./selectAcceptedMatch";
import type { RecognitionMappingStatus, RecognitionMatch } from "./types";

export function buildMappingStatuses(
  mappings: PresetMappingCardData[],
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
      confidence,
      isActive: mapping.id === acceptedMatchId,
    };
  });
}
