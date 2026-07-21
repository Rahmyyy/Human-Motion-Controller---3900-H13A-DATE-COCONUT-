import BackButton from "@/components/BackButton";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router";
import { getPresets, type Preset } from "./api/presetsApi";
import CameraModeToggle from "./components/CameraModeToggle";
import CreatePresetDialog from "./components/CreatePresetDialog";
import PresetActionBar from "./components/PresetActionBar";
import PresetCollection from "./components/PresetCollection";

export default function PresetSelectionPage() {
  const { patientId } = useParams();
  const location = useLocation();
  const patientName = location.state?.patientName ?? "selected patient";
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) {
      setError("Missing patient ID.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    getPresets(patientId)
      .then((savedPresets) => {
        if (!isMounted) return;
        setPresets(savedPresets);
        setError(null);
      })
      .catch((error) => {
        console.error("Failed to load presets", error);
        if (isMounted) setError("Failed to load presets.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  const selectedPreset = presets.find((preset) => preset.id === selectedPresetId);

  return (
    <section className="min-h-screen bg-background px-8 py-10 pb-32">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Choose or Create a Preset for {patientName}.
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Select a pre-existing mapping profile or create a new one to begin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <CameraModeToggle />
            <BackButton />
            {patientId && <CreatePresetDialog patientId={patientId} />}
          </div>
        </header>

        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight">Existing Presets</h2>

          {isLoading ? (
            <p className="mt-5 text-sm text-muted-foreground">Loading presets...</p>
          ) : error ? (
            <p className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : (
            <PresetCollection
              presets={presets}
              selectedPresetId={selectedPresetId}
              onSelectPreset={setSelectedPresetId}
            />
          )}
        </section>
      </div>

      <PresetActionBar selectedPreset={selectedPreset} />
    </section>
  );
}
