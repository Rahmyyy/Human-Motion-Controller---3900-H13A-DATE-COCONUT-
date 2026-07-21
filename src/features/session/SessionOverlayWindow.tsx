import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useParams } from "react-router";
import AnnotatedPreview from "@/features/camera/AnnotatedPreview";
import MediaPipePosePreview from "@/features/camera/MediaPipePosePreview";
import { getCameraMode } from "@/features/camera/cameraMode";
import { parsePoseFrames } from "@/features/camera/parsePoseFrames";
import type { PoseFrame } from "@/features/camera/poseFrame";
import { getMovementMappings } from "@/features/movement-mapping/api/movementMappingsApi";
import { useMovementRecognition } from "@/features/movement-recognition/hooks/useMovementRecognition";
import type { PresetMappingCardData } from "@/features/preset-mapping/types";
import { getPreset } from "@/features/presets/api/presetsApi";
import { endSession, getSessionStatus, startSession } from "@/lib/liveSessionState";
import SessionOverlay from "./components/SessionOverlay";
import { useSessionSnapshot } from "./hooks/useSessionSnapshot";
import { useTransparentWindow } from "./hooks/useTransparentWindow";

/**
 * Root of the always-on-top overlay window.
 *
 * The recognition pipeline runs *here* rather than in the main window on
 * purpose: once the user tabs over to their game the main window is occluded,
 * and WebView2 throttles its requestAnimationFrame loop to a crawl. This window
 * stays visible above the game, so its frame loop keeps running at full rate.
 * That also makes it the owner of the session store, camera and key presses.
 */
export default function SessionOverlayWindow() {
  const { presetId } = useParams<{ presetId: string }>();
  const [mappings, setMappings] = useState<PresetMappingCardData[]>([]);
  const [defaultPoseFrames, setDefaultPoseFrames] = useState<PoseFrame[]>([]);
  const [presetName, setPresetName] = useState("Session");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cameraMode] = useState(() => getCameraMode());
  const { onPoseFrame, status } = useMovementRecognition(mappings, defaultPoseFrames);
  const { elapsedMs, triggerCount } = useSessionSnapshot();
  const displayedLoadError = presetId ? loadError : "Preset not found.";

  useTransparentWindow();

  useEffect(() => {
    startSession();

    return () => {
      if (getSessionStatus() === "running") {
        endSession();
      }
    };
  }, []);

  useEffect(() => {
    if (!presetId) return;

    let isMounted = true;

    Promise.all([getPreset(presetId), getMovementMappings(presetId)])
      .then(([preset, savedMappings]) => {
        if (!isMounted) return;
        setPresetName(preset.name);

        if (!preset.defaultPoseFramesJson) {
          setLoadError("Record a default resting state before starting a session.");
          return;
        }

        setMappings(savedMappings);
        setDefaultPoseFrames(parsePoseFrames(preset.defaultPoseFramesJson));
        setLoadError(null);
      })
      .catch((error) => {
        if (!isMounted) return;
        setLoadError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      isMounted = false;
    };
  }, [presetId]);

  function handleStop() {
    endSession();
    // Rust closes this window and returns the main window to preset selection,
    // so both windows agree the session is over.
    void invoke("close_overlay");
  }

  return (
    <SessionOverlay
      presetName={presetName}
      status={{ ...status, error: displayedLoadError ?? status.error }}
      elapsedMs={elapsedMs}
      triggerCount={triggerCount}
      onStop={handleStop}
    >
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/10">
        {cameraMode === "backend" ? (
          <AnnotatedPreview />
        ) : (
          <MediaPipePosePreview onPoseFrame={onPoseFrame} />
        )}
      </div>
    </SessionOverlay>
  );
}
