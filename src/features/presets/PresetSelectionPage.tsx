import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router";
import { getPatient } from "@/modules/patient-presets";
import PresetActionBar from "./components/PresetActionBar";
import PresetCollection from "./components/PresetCollection";
import PresetPageHeader from "./components/PresetPageHeader";
import { usePresetSelection } from "./hooks/usePresetSelection";

export default function PresetSelectionPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const location = useLocation();
  const routedPatientName =
    typeof location.state?.patientName === "string" ? location.state.patientName : null;
  const [loadedPatient, setLoadedPatient] = useState<{
    id: string;
    displayName: string;
  } | null>(null);
  const patientName = patientId
    ? loadedPatient?.id === patientId
      ? loadedPatient.displayName
      : (routedPatientName ?? "Loading patient...")
    : "Patient";
  const presets = usePresetSelection(patientId);

  useEffect(() => {
    let isMounted = true;

    if (patientId) {
      getPatient(patientId)
        .then((patient) => {
          if (isMounted) {
            setLoadedPatient({ id: patient.id, displayName: patient.displayName });
          }
        })
        .catch((error) => {
          console.error("Failed to load patient", error);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  return (
    <section className="site-page-gutter min-h-screen bg-muted/20 py-8 pb-40">
      <div className="w-full">
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
