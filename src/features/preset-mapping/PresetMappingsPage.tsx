import { Button } from "@/components/ui/button";
import {
  deleteMovementMapping,
  getMovementMappings,
} from "@/features/movement-mapping/api/movementMappingsApi";
import { getPreset } from "@/features/presets/api/presetsApi";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import PresetMappingCollection from "./components/PresetMappingCollection";
import PresetMappingsHeader from "./components/PresetMappingsHeader";
import type { PresetMappingCardData } from "./types";

export default function PresetMappingsPage() {
  const { presetId } = useParams<{ presetId: string }>();
  const [mappings, setMappings] = useState<PresetMappingCardData[]>([]);
  const [presetName, setPresetName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const displayedError = presetId ? error : "Preset not found.";

  useEffect(() => {
    if (!presetId) return;

    let isMounted = true;

    Promise.all([getPreset(presetId), getMovementMappings(presetId)])
      .then(([preset, savedMappings]) => {
        if (isMounted) {
          setPresetName(preset.name);
          setMappings(savedMappings);
          setError(null);
        }
      })
      .catch((error) => {
        console.error("Failed to load preset mappings", error);
        if (isMounted) {
          setError("Failed to load preset mappings.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [presetId]);

  function handleDelete(id: string) {
    if (!presetId) return;

    deleteMovementMapping(id, presetId)
      .then(() => {
        setMappings((current) => current.filter((mapping) => mapping.id !== id));
        setError(null);
      })
      .catch((error) => {
        console.error("Failed to delete movement mapping", error);
        setError("Failed to delete movement mapping.");
      });
  }

  return (
    <section className="min-h-screen bg-background px-8 py-10">
      <div className="mx-auto max-w-6xl">
        <PresetMappingsHeader presetId={presetId} presetName={presetName} />

        {displayedError && (
          <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {displayedError}
          </p>
        )}

        {presetId && (
          <PresetMappingCollection
            mappings={mappings}
            onDelete={handleDelete}
            presetId={presetId}
          />
        )}
      </div>

      <div className="fixed inset-x-0 bottom-8 px-8">
        <div className="mx-auto flex max-w-6xl justify-end">
          <Button asChild size="lg">
            <Link to={`/presets/${presetId}/recognition`}>Test Recognition</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
