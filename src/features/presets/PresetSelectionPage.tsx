import { useEffect, useState } from "react";
import { getPresets, type Preset } from "./api/presetsApi";
import PresetActionBar from "./components/PresetActionBar";
import PresetCollection from "./components/PresetCollection";
import PresetPageHeader from "./components/PresetPageHeader";

const patientName = "Lindsay Collins";

export default function PresetSelectionPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getPresets()
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
  }, []);

  const selectedPreset = presets.find((preset) => preset.id === selectedPresetId);
  const handlePresetDuplicated = (preset: Preset) => {
    setPresets((currentPresets) => [preset, ...currentPresets]);
    setSelectedPresetId(preset.id);
    setError(null);
  };

  return (
    <section className="min-h-screen bg-muted/20 px-8 py-8 pb-40">
      <div className="mx-auto max-w-7xl">
        <PresetPageHeader patientName={patientName} />

        <section className="mt-8" aria-label="Saved presets">
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
              onDuplicatePreset={handlePresetDuplicated}
              onSelectPreset={setSelectedPresetId}
            />
          )}
        </section>
      </div>

      <PresetActionBar patientName={patientName} selectedPreset={selectedPreset} />
    </section>
  );
}
