import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { parsePoseFrames } from "@/features/camera/parsePoseFrames";
import { getPreset, type Preset } from "./api/presetsApi";
import DefaultPoseCalibrationWorkspace from "./components/DefaultPoseCalibrationWorkspace";

export default function DefaultPoseCalibrationPage() {
  const { presetId } = useParams<{ presetId: string }>();
  const [preset, setPreset] = useState<Preset | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!presetId) return;

    let isMounted = true;
    getPreset(presetId)
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
  }, [presetId]);

  if (!presetId || loadError) {
    return <CalibrationMessage message={loadError ?? "Preset not found."} />;
  }

  if (!preset) {
    return <CalibrationMessage message="Loading calibration..." />;
  }

  const initialFrames = parsePoseFrames(preset.defaultPoseFramesJson);
  return (
    <DefaultPoseCalibrationWorkspace
      key={preset.defaultPoseFramesJson ?? "new-calibration"}
      initialFrames={initialFrames}
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
