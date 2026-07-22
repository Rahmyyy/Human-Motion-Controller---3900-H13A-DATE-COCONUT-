import { Button } from "@/components/ui/button";
import { Link, useParams } from "react-router";
import PresetMappingCollection from "./components/PresetMappingCollection";
import CalibrationRequirementCard from "./components/CalibrationRequirementCard";
import PresetMappingsHeader from "./components/PresetMappingsHeader";
import { usePresetMappings } from "./hooks/usePresetMappings";

export default function PresetMappingsPage() {
  const { presetId } = useParams<{ presetId: string }>();
  const mappings = usePresetMappings(presetId);

  return (
    <section className="min-h-screen bg-background px-8 py-10">
      <div className="mx-auto max-w-6xl">
        <PresetMappingsHeader
          canAddMovement={Boolean(mappings.preset?.defaultPoseFramesJson)}
          presetId={presetId}
          presetName={mappings.preset?.name ?? null}
        />

        {mappings.error && (
          <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {mappings.error}
          </p>
        )}

        {mappings.preset && (
          <CalibrationRequirementCard
            isCalibrated={Boolean(mappings.preset.defaultPoseFramesJson)}
            presetId={mappings.preset.id}
          />
        )}

        {presetId && (
          <PresetMappingCollection
            deletingMappingId={mappings.deletingMappingId}
            mappings={mappings.mappings}
            onDelete={mappings.deleteMapping}
            presetId={presetId}
          />
        )}
      </div>

      <div className="fixed inset-x-0 bottom-8 px-8">
        <div className="mx-auto flex max-w-6xl justify-end">
          {mappings.preset?.defaultPoseFramesJson ? (
            <Button asChild size="lg">
              <Link to={`/presets/${presetId}/recognition`}>Test Recognition</Link>
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
