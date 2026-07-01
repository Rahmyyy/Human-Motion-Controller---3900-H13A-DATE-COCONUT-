import type { PresetMappingCardData } from "@/features/preset-mapping/types";
import {
  CONFIDENCE_THRESHOLD,
  type RecognitionMappingStatus,
  type RecognitionMatch,
} from "./types";

export function buildMappingStatuses(
  mappings: PresetMappingCardData[],
  matches: RecognitionMatch[],
): RecognitionMappingStatus[] {
  const matchesById = new Map(matches.map((match) => [match.id, match]));

  return mappings.map((mapping) => {
    const match = matchesById.get(mapping.id);
    const confidence = match?.confidence ?? 0;

    return {
      id: mapping.id,
      name: mapping.name,
      keybind: mapping.keybind,
      confidence,
      isActive: confidence >= CONFIDENCE_THRESHOLD,
    };
  });
}
