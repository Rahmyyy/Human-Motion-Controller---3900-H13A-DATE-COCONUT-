import { useLocation, useParams } from "react-router";
import PresetActionBar from "./components/PresetActionBar";
import PresetCollection from "./components/PresetCollection";
import PresetPageHeader from "./components/PresetPageHeader";
import { usePresetSelection } from "./hooks/usePresetSelection";

export default function PresetSelectionPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const location = useLocation();
  const patientName = location.state?.patientName ?? "selected patient";
  const presets = usePresetSelection(patientId);

  return (
    <section className="min-h-screen bg-muted/20 px-8 py-8 pb-40">
      <div className="mx-auto max-w-7xl">
        <PresetPageHeader
          patientId={patientId}
          patientName={patientName}
          createError={presets.createError}
          isCreating={presets.isCreating}
          onClearCreateError={presets.clearCreateError}
          onCreatePreset={presets.createPreset}
        />

        <section className="mt-8" aria-label="Saved presets">
          {presets.isLoading ? (
            <p className="mt-5 text-sm text-muted-foreground">Loading presets...</p>
          ) : presets.error ? (
            <p className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {presets.error}
            </p>
          ) : (
            <PresetCollection
              presets={presets.presets}
              selectedPresetId={presets.selectedPresetId}
              deletingPresetId={presets.deletingPresetId}
              deleteError={presets.deleteError}
              duplicatingPresetId={presets.duplicatingPresetId}
              duplicateError={presets.duplicateError}
              onClearDeleteError={presets.clearDeleteError}
              onClearDuplicateError={presets.clearDuplicateError}
              onDeletePreset={presets.deletePreset}
              onDuplicatePreset={presets.duplicatePreset}
              onSelectPreset={presets.selectPreset}
            />
          )}
        </section>
      </div>

      <PresetActionBar
        patientId={patientId}
        patientName={patientName}
        selectedPreset={presets.selectedPreset ?? undefined}
      />
    </section>
  );
}
