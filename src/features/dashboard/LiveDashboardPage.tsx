import { useEffect, useState } from "react";
import { useParams } from "react-router";
import BackButton from "@/components/BackButton";
import { getMovementMappings } from "@/features/movement-mapping/api/movementMappingsApi";
import type { PresetMappingCardData } from "@/features/preset-mapping/types";
import ActiveMappingsPanel from "./components/ActiveMappingsPanel";
import SessionStatusPanel from "./components/SessionStatusPanel";
import TriggerCountPanel from "./components/TriggerCountPanel";

export default function LiveDashboardPage() {
  const { presetId } = useParams<{ presetId: string }>();
  const [mappings, setMappings] = useState<PresetMappingCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
    <main className="min-h-screen bg-slate-50 p-8">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Live Session Dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Monitor mappings, session duration, and triggers while a session is running.
          </p>
        </div>
        <BackButton to={`/presets/${presetId}/recognition`} />
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <ActiveMappingsPanel
          mappings={mappings}
          isLoading={Boolean(presetId) && isLoading}
          loadError={displayedLoadError}
        />
        <SessionStatusPanel />
        <TriggerCountPanel />
      </div>
    </main>
  );
}
