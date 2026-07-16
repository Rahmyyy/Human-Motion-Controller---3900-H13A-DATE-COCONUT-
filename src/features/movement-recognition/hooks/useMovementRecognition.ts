import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PoseFrame } from "@/features/camera/poseFrame";
import { recordSuccessfulTrigger } from "@/lib/liveSessionState";
import type { PresetMappingCardData } from "@/features/preset-mapping/types";
import { buildMappingStatuses } from "../recognition/buildMappingStatuses";
import { findTemplateMatches, trimLiveBuffer } from "../recognition/findBestMatch";
import { normalizePoseFrame } from "../recognition/normalizePose";
import { prepareMovementTemplates } from "../recognition/prepareTemplates";
import { pressMatchedKey } from "../recognition/pressMatchedKey";
import {
  CONFIDENCE_THRESHOLD,
  REQUIRED_CONSECUTIVE_MATCHES,
  REQUIRED_CONSECUTIVE_RELEASES,
  RELEASE_CONFIDENCE_THRESHOLD,
  type NormalizedPoseFrame,
  type RecognitionMatch,
  type RecognitionMappingStatus,
} from "../recognition/types";

export type RecognitionStatus = {
  bestMatch: RecognitionMatch | null;
  mappingStatuses: RecognitionMappingStatus[];
  error: string | null;
};

type RecognitionRuntimeStatus = {
  sourceMappings: PresetMappingCardData[];
  bestMatch: RecognitionMatch | null;
  matches: RecognitionMatch[];
  error: string | null;
};

type MatchStreak = {
  id: string;
  count: number;
};

export function useMovementRecognition(mappings: PresetMappingCardData[]) {
  const templates = useMemo(() => prepareMovementTemplates(mappings), [mappings]);
  const liveFramesRef = useRef<NormalizedPoseFrame[]>([]);
  const streakRef = useRef<MatchStreak>({ id: "", count: 0 });
  const latchedMappingIdRef = useRef<string | null>(null);
  const releaseStreakRef = useRef(0);
  const [runtimeStatus, setRuntimeStatus] = useState<RecognitionRuntimeStatus>({
    sourceMappings: mappings,
    bestMatch: null,
    matches: [],
    error: null,
  });

  useEffect(() => {
    liveFramesRef.current = [];
    streakRef.current = { id: "", count: 0 };
    latchedMappingIdRef.current = null;
    releaseStreakRef.current = 0;
  }, [templates]);

  const status = useMemo<RecognitionStatus>(() => {
    const isCurrentMappingSet = runtimeStatus.sourceMappings === mappings;
    const matches = isCurrentMappingSet ? runtimeStatus.matches : [];

    return {
      bestMatch: isCurrentMappingSet ? runtimeStatus.bestMatch : null,
      mappingStatuses: buildMappingStatuses(mappings, matches),
      error: isCurrentMappingSet ? runtimeStatus.error : null,
    };
  }, [mappings, runtimeStatus]);

  const fireTrigger = useCallback(
    (match: RecognitionMatch) => {
      void pressMatchedKey(match)
        .then(() => {
          recordSuccessfulTrigger();
          setRuntimeStatus((current) => ({ ...current, sourceMappings: mappings, error: null }));
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          setRuntimeStatus((current) => ({ ...current, sourceMappings: mappings, error: message }));
        });
    },
    [mappings],
  );

  const onPoseFrame = useCallback(
    (frame: PoseFrame) => {
      const normalizedFrame = normalizePoseFrame(frame);
      if (!normalizedFrame || templates.length === 0) {
        return;
      }

      const liveFrames = trimLiveBuffer(
        [...liveFramesRef.current, normalizedFrame],
        normalizedFrame.timestampMs,
      );
      liveFramesRef.current = liveFrames;

      const matches = findTemplateMatches(templates, liveFrames);
      const bestMatch = matches[0] ?? null;
      setRuntimeStatus((current) => ({
        ...current,
        sourceMappings: mappings,
        bestMatch,
        matches,
      }));

      const latchedMappingId = latchedMappingIdRef.current;
      if (latchedMappingId) {
        const latchedMatch = matches.find((match) => match.id === latchedMappingId);
        const isReleased = !latchedMatch || latchedMatch.confidence <= RELEASE_CONFIDENCE_THRESHOLD;

        releaseStreakRef.current = isReleased ? releaseStreakRef.current + 1 : 0;

        if (releaseStreakRef.current >= REQUIRED_CONSECUTIVE_RELEASES) {
          latchedMappingIdRef.current = null;
          releaseStreakRef.current = 0;
          streakRef.current = { id: "", count: 0 };
        }

        return;
      }

      if (!bestMatch || bestMatch.confidence < CONFIDENCE_THRESHOLD) {
        streakRef.current = { id: "", count: 0 };
        return;
      }

      const nextCount = streakRef.current.id === bestMatch.id ? streakRef.current.count + 1 : 1;
      streakRef.current = { id: bestMatch.id, count: nextCount };

      if (nextCount < REQUIRED_CONSECUTIVE_MATCHES) {
        return;
      }

      latchedMappingIdRef.current = bestMatch.id;
      releaseStreakRef.current = 0;
      // Do not let the frames that produced this match contribute to another match.
      // Fresh camera frames can begin building the next movement immediately.
      liveFramesRef.current = [];
      fireTrigger(bestMatch);
    },
    [fireTrigger, mappings, templates],
  );

  return { onPoseFrame, status };
}
