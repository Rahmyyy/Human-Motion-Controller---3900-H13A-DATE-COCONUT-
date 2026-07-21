import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import {
  deleteMovementMapping,
  getMovementMappings,
} from "@/features/movement-mapping/api/movementMappingsApi";
import { getPreset, type Preset } from "@/features/presets/api/presetsApi";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import PresetMappingCollection from "./components/PresetMappingCollection";
import CalibrationRequirementCard from "./components/CalibrationRequirementCard";
import type { PresetMappingCardData } from "./types";

export default function PresetMappingsPage() {
  const { patientId, presetId } = useParams<{ patientId: string, presetId: string }>();
  const [mappings, setMappings] = useState<PresetMappingCardData[]>([]);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const displayedError =
    patientId && presetId ? error : "Patient or preset not found.";

  useEffect(() => {
    if (!patientId || !presetId) return;

    let isMounted = true;

    Promise.all([getPreset(presetId, patientId), getMovementMappings(presetId)])
      .then(([preset, savedMappings]) => {
        if (isMounted) {
          setPreset(preset);
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
  }, [patientId, presetId]);

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
        <header className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              {preset ? `Edit ${preset.name} Mappings` : "Edit Mappings"}
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Configure movement mappings for this preset.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <BackButton />
            {preset?.defaultPoseFramesJson ? (
              <Button asChild size="lg">
                <Link to={`/patients/${patientId}/presets/${presetId}/movements/new`}>
                  <Plus className="size-4" aria-hidden="true" />
                  Add New Movement
                </Link>
              </Button>
            ) : (
              <Button disabled size="lg">
                <Plus className="size-4" aria-hidden="true" />
                Add New Movement
              </Button>
            )}
          </div>
        </header>

        {displayedError && (
          <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {displayedError}
          </p>
        )}

        {preset && patientId && (
          <CalibrationRequirementCard
            isCalibrated={Boolean(preset.defaultPoseFramesJson)}
            patientId={patientId}
            presetId={preset.id}
          />
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
          {preset?.defaultPoseFramesJson ? (
            <Button asChild size="lg">
              <Link to={`/patients/${patientId}/presets/${presetId}/recognition`}>
                Test Recognition
              </Link>
            </Button>
          ) : (
            <Button disabled size="lg">
              Test Recognition
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
