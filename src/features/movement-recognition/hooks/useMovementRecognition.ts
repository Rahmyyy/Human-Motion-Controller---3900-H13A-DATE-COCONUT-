import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { PoseFrame } from "@/features/camera/poseFrame";
import type { PresetMappingCardData } from "@/features/preset-mapping/types";
import { findBestTemplateMatch, trimLiveBuffer } from "../recognition/findBestMatch";
import { normalizePoseFrame } from "../recognition/normalizePose";
import { prepareMovementTemplates } from "../recognition/prepareTemplates";
import {
  CONFIDENCE_THRESHOLD,
  RECOGNITION_COOLDOWN_MS,
  REQUIRED_CONSECUTIVE_MATCHES,
  type NormalizedPoseFrame,
  type RecognitionMatch,
} from "../recognition/types";

export type RecognitionStatus = {
  templateCount: number;
  bestMatch: RecognitionMatch | null;
  triggeredMatch: RecognitionMatch | null;
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
    templateCount: 0,
    bestMatch: null,
    triggeredMatch: null,
    error: null,
  });

  useEffect(() => {
    liveFramesRef.current = [];
    streakRef.current = { id: "", count: 0 };
    lastTriggeredAtRef.current = Number.NEGATIVE_INFINITY;
    setStatus({ templateCount: templates.length, bestMatch: null, triggeredMatch: null, error: null });
  }, [templates]);

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

      const bestMatch = findBestTemplateMatch(templates, liveFrames);
      setStatus((current) => ({ ...current, templateCount: templates.length, bestMatch }));

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
      void pressKey(bestMatch, setStatus);
    },
    [templates],
  );

  return { onPoseFrame, status };
}

async function pressKey(
  match: RecognitionMatch,
  setStatus: Dispatch<SetStateAction<RecognitionStatus>>,
) {
  try {
    await invoke("press_key", { key: match.keybind });
    setStatus((current) => ({ ...current, triggeredMatch: match, error: null }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus((current) => ({ ...current, error: message }));
  }
}
