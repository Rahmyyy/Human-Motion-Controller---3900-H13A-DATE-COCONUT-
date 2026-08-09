import { useEffect, useState } from "react";
import { useParams } from "react-router";
import BackButton from "@/components/BackButton";
import { getMovementMappings, type MovementMapping } from "@/modules/movement-mapping";
import ActiveMappingsPanel from "./components/ActiveMappingsPanel";
import SessionStatusPanel from "./components/SessionStatusPanel";
import TriggerCountPanel from "./components/TriggerCountPanel";

export default function LiveDashboardPage() {
  const { patientId, presetId } = useParams<{ patientId: string; presetId: string }>();
  const [mappings, setMappings] = useState<MovementMapping[]>([]);
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
    <main className="site-page-gutter min-h-screen bg-slate-50 py-8">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Live Session Dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Monitor mappings, session duration, and triggers while a session is running.
          </p>
        </div>
        <BackButton to={`/patients/${patientId}/presets/${presetId}/recognition`} />
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
