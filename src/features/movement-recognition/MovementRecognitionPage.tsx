import { useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { Link, useParams } from "react-router";
import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import AnnotatedPreview from "@/features/camera/AnnotatedPreview";
import MediaPipePosePreview from "@/features/camera/MediaPipePosePreview";
import { getCameraMode } from "@/features/camera/cameraMode";
import { getMovementMappings } from "@/features/movement-mapping/api/movementMappingsApi";
import type { PresetMappingCardData } from "@/features/preset-mapping/types";
import RecognitionStatusPanel from "./components/RecognitionStatusPanel";
import { useMovementRecognition } from "./hooks/useMovementRecognition";

export default function MovementRecognitionPage() {
  const { presetId } = useParams<{ presetId: string }>();
  const [mappings, setMappings] = useState<PresetMappingCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cameraMode] = useState(() => getCameraMode());
  const { onPoseFrame, status } = useMovementRecognition(mappings);
  const displayedLoadError = presetId ? loadError : "Preset not found.";

  useEffect(() => {
    if (!presetId) return;

    let isMounted = true;

    getMovementMappings(presetId)
      .then((savedMappings) => {
        if (!isMounted) return;
        setMappings(savedMappings);
        setLoadError(null);
      })
      .catch((error) => {
        if (!isMounted) return;
        setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [presetId]);

  return (
    <main className="grid h-screen w-full grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden bg-slate-50 p-8">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Live Recognition
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Current preset: {presetId}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link to={`/presets/${presetId}/dashboard`}>
              <LayoutDashboard className="size-4" aria-hidden="true" />
              Dashboard
            </Link>
          </Button>
          <BackButton />
        </div>
      </header>

      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="grid min-h-0 min-w-0" aria-label="Live camera recognition">
          {cameraMode === "backend" ? (
            <AnnotatedPreview />
          ) : (
            <MediaPipePosePreview onPoseFrame={onPoseFrame} />
          )}
        </section>
        <RecognitionStatusPanel
          isLoading={Boolean(presetId) && isLoading}
          loadError={displayedLoadError}
          status={status}
        />
      </div>
    </main>
  );
}
