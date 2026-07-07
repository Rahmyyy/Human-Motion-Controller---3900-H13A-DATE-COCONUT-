import { useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { Link } from "react-router";
import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import AnnotatedPreview from "@/features/camera/AnnotatedPreview";
import MediaPipePosePreview from "@/features/camera/MediaPipePosePreview";
import { getCameraMode } from "@/features/camera/cameraMode";
import { getMovementMappings } from "@/features/movement-mapping/api/movementMappingsApi";
import type { PresetMappingCardData } from "@/features/preset-mapping/types";
import RecognitionStatusPanel from "./components/RecognitionStatusPanel";
import { useMovementRecognition } from "./hooks/useMovementRecognition";

const PRESET_ID = "preset-1";

export default function MovementRecognitionPage() {
  const [mappings, setMappings] = useState<PresetMappingCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cameraMode] = useState(() => getCameraMode());
  const { onPoseFrame, status, simulateTrigger } = useMovementRecognition(mappings);

  useEffect(() => {
    let isMounted = true;

    getMovementMappings(PRESET_ID)
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
  }, []);

  return (
    <main className="grid h-screen w-full grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden bg-slate-50 p-8">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Live Recognition
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Current preset: {PRESET_ID}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* TEMP: test button, no webcam needed. Remove later. */}
          <Button
            type="button"
            variant="secondary"
            disabled={mappings.length === 0}
            onClick={() => {
              const mapping = mappings[0];
              simulateTrigger({
                id: mapping.id,
                name: mapping.name,
                keybind: mapping.keybind,
                confidence: 1,
              });
            }}
          >
            Simulate Trigger (test)
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">
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
        <RecognitionStatusPanel isLoading={isLoading} loadError={loadError} status={status} />
      </div>
    </main>
  );
}
