import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PoseFrame } from "@/features/camera/poseFrame";
import { recordSuccessfulTrigger } from "@/lib/liveSessionState";
import type { PresetMappingCardData } from "@/features/preset-mapping/types";
import { buildMappingStatuses } from "../recognition/buildMappingStatuses";
import { normalizePoseFrames } from "../recognition/normalizePose";
import { prepareMovementTemplates } from "../recognition/prepareTemplates";
import { pressMatchedKey } from "../recognition/pressMatchedKey";
import { type RecognitionMatch, type RecognitionMappingStatus } from "../recognition/types";
import {
  createRecognitionSessionState,
  processRecognitionFrame,
} from "../recognition/processRecognitionFrame";

export type RecognitionStatus = {
  bestMatch: RecognitionMatch | null;
  mappingStatuses: RecognitionMappingStatus[];
  waitingForDefaultPose: boolean;
  error: string | null;
};

type RecognitionRuntimeStatus = {
  sourceMappings: PresetMappingCardData[];
  bestMatch: RecognitionMatch | null;
  matches: RecognitionMatch[];
  defaultPoseConfidence: number;
  waitingForDefaultPose: boolean;
  error: string | null;
};

export function useMovementRecognition(
  mappings: PresetMappingCardData[],
  defaultPoseFrames: PoseFrame[] = [],
) {
  const templates = useMemo(() => prepareMovementTemplates(mappings), [mappings]);
  const normalizedDefaultPoseFrames = useMemo(
    () => normalizePoseFrames(defaultPoseFrames),
    [defaultPoseFrames],
  );
  const sessionRef = useRef(createRecognitionSessionState());
  const [runtimeStatus, setRuntimeStatus] = useState<RecognitionRuntimeStatus>({
    sourceMappings: mappings,
    bestMatch: null,
    matches: [],
    defaultPoseConfidence: 0,
    waitingForDefaultPose: false,
    error: null,
  });

  useEffect(() => {
    sessionRef.current = createRecognitionSessionState();
  }, [normalizedDefaultPoseFrames, templates]);

  const status = useMemo<RecognitionStatus>(() => {
    const isCurrentMappingSet = runtimeStatus.sourceMappings === mappings;
    const matches = isCurrentMappingSet ? runtimeStatus.matches : [];

    return {
      bestMatch: isCurrentMappingSet ? runtimeStatus.bestMatch : null,
      mappingStatuses: buildMappingStatuses(
        mappings,
        matches,
        runtimeStatus.defaultPoseConfidence,
        !runtimeStatus.waitingForDefaultPose,
      ),
      waitingForDefaultPose: runtimeStatus.waitingForDefaultPose,
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
      const result = processRecognitionFrame(
        sessionRef.current,
        frame,
        templates,
        normalizedDefaultPoseFrames,
      );
      if (!result) return;
      sessionRef.current = result.state;

      setRuntimeStatus((current) => ({
        ...current,
        sourceMappings: mappings,
        bestMatch: result.bestMatch,
        matches: result.matches,
        defaultPoseConfidence: result.defaultPoseConfidence,
        waitingForDefaultPose: result.waitingForDefaultPose,
      }));

      if (result.triggeredMatch) {
        fireTrigger(result.triggeredMatch);
      }
    },
    [fireTrigger, mappings, normalizedDefaultPoseFrames, templates],
  );

  return { onPoseFrame, status };
}
