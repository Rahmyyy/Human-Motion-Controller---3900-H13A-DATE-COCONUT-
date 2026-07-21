import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { getPreset } from "@/features/presets/api/presetsApi";
import MovementMappingWorkspace from "./components/MovementMappingWorkspace";
import { createMovementMapping } from "./api/movementMappingsApi";

export default function MovementMappingPage() {
  const { patientId, presetId } = useParams<{ patientId: string; presetId: string }>();
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isCalibrationReady, setIsCalibrationReady] = useState(false);

  useEffect(() => {
    if (!patientId || !presetId) return;

    let isMounted = true;
    getPreset(presetId, patientId)
      .then((preset) => {
        if (!isMounted) return;
        if (!preset.defaultPoseFramesJson) {
          navigate(`/patients/${patientId}/presets/${presetId}/default-pose`, {
            replace: true,
          });
          return;
        }
        setIsCalibrationReady(true);
      })
      .catch((error) => {
        console.error("Failed to verify default pose", error);
        if (isMounted) setSaveError("Failed to load this preset.");
      });

    return () => {
      isMounted = false;
    };
  }, [patientId, navigate, presetId]);

  if (!isCalibrationReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-8">
        <p className="text-sm text-muted-foreground">
          {saveError ?? "Checking default-pose calibration..."}
        </p>
      </main>
    );
  }

  return (
    <MovementMappingWorkspace
      title="Record and Map New Movement"
      description="Capture a physical movement and assign it to a keybind."
      saveError={saveError}
      onSave={async ({ frames, keybind, name }) => {
        setSaveError(null);

        if (!patientId || !presetId) {
          setSaveError("Cannot save this movement because the patient or preset was not found.");
          return;
        }

        try {
          await createMovementMapping({
            keybind,
            name,
            poseFramesJson: JSON.stringify(frames),
            presetId,
          });

          navigate(`/patients/${patientId}/presets/${presetId}/edit`);
        } catch (error) {
          console.error("Failed to save movement mapping", error);
          setSaveError("Failed to save movement mapping. Please try again.");
        }
      }}
    />
  );
}
