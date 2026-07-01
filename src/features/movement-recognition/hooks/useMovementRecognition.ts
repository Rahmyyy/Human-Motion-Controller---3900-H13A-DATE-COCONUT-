import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PoseFrame } from "@/features/camera/poseFrame";
import type { PresetMappingCardData } from "@/features/preset-mapping/types";
import { buildMappingStatuses } from "../recognition/buildMappingStatuses";
import { findTemplateMatches, trimLiveBuffer } from "../recognition/findBestMatch";
import { normalizePoseFrame } from "../recognition/normalizePose";
import { prepareMovementTemplates } from "../recognition/prepareTemplates";
import { pressMatchedKey } from "../recognition/pressMatchedKey";
import {
  CONFIDENCE_THRESHOLD,
  RECOGNITION_COOLDOWN_MS,
  REQUIRED_CONSECUTIVE_MATCHES,
  type NormalizedPoseFrame,
  type RecognitionMatch,
  type RecognitionMappingStatus,
} from "../recognition/types";

export type RecognitionStatus = {
  bestMatch: RecognitionMatch | null;
  mappingStatuses: RecognitionMappingStatus[];
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
  const lastTriggeredAtRef = useRef(Number.NEGATIVE_INFINITY);
  const [status, setStatus] = useState<RecognitionStatus>({
    bestMatch: null,
    mappingStatuses: [],
    error: null,
  });

  useEffect(() => {
    liveFramesRef.current = [];
    streakRef.current = { id: "", count: 0 };
    lastTriggeredAtRef.current = Number.NEGATIVE_INFINITY;
    setStatus({
      bestMatch: null,
      mappingStatuses: buildMappingStatuses(mappings, []),
      error: null,
    });
  }, [mappings, templates]);

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
      setStatus((current) => ({
        ...current,
        bestMatch,
        mappingStatuses: buildMappingStatuses(mappings, matches),
      }));

      if (!bestMatch || bestMatch.confidence < CONFIDENCE_THRESHOLD) {
        streakRef.current = { id: "", count: 0 };
        return;
      }

      const nextCount = streakRef.current.id === bestMatch.id ? streakRef.current.count + 1 : 1;
      streakRef.current = { id: bestMatch.id, count: nextCount };

      if (
        nextCount < REQUIRED_CONSECUTIVE_MATCHES ||
        normalizedFrame.timestampMs - lastTriggeredAtRef.current < RECOGNITION_COOLDOWN_MS
      ) {
        return;
      }

      lastTriggeredAtRef.current = normalizedFrame.timestampMs;
      void pressMatchedKey(bestMatch)
        .then(() => setStatus((current) => ({ ...current, error: null })))
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          setStatus((current) => ({ ...current, error: message }));
        });
    },
    [mappings, templates],
  );

  return { onPoseFrame, status };
}
