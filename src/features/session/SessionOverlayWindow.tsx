import { useParams, useSearchParams } from "react-router";
import MediaPipePosePreview from "@/features/camera/MediaPipePosePreview";
import SessionOverlay from "./components/SessionOverlay";
import { useLiveSession } from "./hooks/useLiveSession";
import { useTransparentWindow } from "./hooks/useTransparentWindow";

/**
 * Root of the always-on-top overlay window.
 *
 * The recognition pipeline runs *here* rather than in the main window on
 * purpose: once the user tabs over to their game the main window is occluded,
 * and WebView2 throttles its requestAnimationFrame loop to a crawl. This window
 * stays visible above the game, so its frame loop keeps running at full rate.
 * The live-session service owns loading, validation, recognition, statistics,
 * and shutdown; this component only renders its snapshot.
 */
export default function SessionOverlayWindow() {
  const { patientId, presetId } = useParams<{ patientId: string; presetId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId") ?? undefined;
  const { elapsedMs, endSession, presetName, recognitionStatus, triggerCount } = useLiveSession(
    patientId,
    presetId,
    sessionId,
  );

  useTransparentWindow();

  return (
    <SessionOverlay
      presetName={presetName}
      status={recognitionStatus}
      elapsedMs={elapsedMs}
      triggerCount={triggerCount}
      onStop={endSession}
    >
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/10">
        <MediaPipePosePreview />
      </div>
    </SessionOverlay>
  );
}
