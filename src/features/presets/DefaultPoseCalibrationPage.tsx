import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { parsePoseFrames } from "@/features/camera/parsePoseFrames";
import { getPreset, type Preset } from "./api/presetsApi";
import DefaultPoseCalibrationWorkspace from "./components/DefaultPoseCalibrationWorkspace";

export default function DefaultPoseCalibrationPage() {
  const { patientId, presetId } = useParams<{ patientId: string, presetId: string }>();
  const [preset, setPreset] = useState<Preset | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId || !presetId) return;

    let isMounted = true;
    getPreset(presetId, patientId)
      .then((loadedPreset) => {
        if (isMounted) setPreset(loadedPreset);
      })
      .catch((error) => {
        console.error("Failed to load preset calibration", error);
        if (isMounted) setLoadError("Failed to load this preset.");
      });

    return () => {
      isMounted = false;
    };
  }, [patientId, presetId]);

  if (!patientId || !presetId || loadError) {
    return (
      <CalibrationMessage
        message={loadError ?? "Patient or preset not found."}
      />
    );
  }

  if (!preset) {
    return <CalibrationMessage message="Loading calibration..." />;
  }

  const initialFrames = parsePoseFrames(preset.defaultPoseFramesJson);
  return (
    <DefaultPoseCalibrationWorkspace
      key={preset.defaultPoseFramesJson ?? "new-calibration"}
      initialFrames={initialFrames}
      patientId={patientId}
      preset={preset}
    />
      );
}

function CalibrationMessage({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-8">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
