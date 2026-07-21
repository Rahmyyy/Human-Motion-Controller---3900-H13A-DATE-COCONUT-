import {
  getMovementMapping,
  updateMovementMapping,
} from "@/features/movement-mapping/api/movementMappingsApi";
import type { MovementMappingDetailsResponse } from "@/features/movement-mapping/api/movementMappingsApi";
import type { PoseFrame } from "@/features/camera/poseFrame";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import MovementMappingWorkspace from "./components/MovementMappingWorkspace";

interface LoadedMovementMapping {
  details: MovementMappingDetailsResponse;
  frames: PoseFrame[];
}

export default function EditMovementMappingPage() {
  const { mappingId, presetId } = useParams<{ mappingId: string; presetId: string }>();
  const navigate = useNavigate();
  const [mapping, setMapping] = useState<LoadedMovementMapping | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!mappingId || !presetId) return;

    getMovementMapping(mappingId, presetId)
      .then((details) => {
        setMapping({
          details,
          frames: JSON.parse(details.pose_frames_json) as PoseFrame[],
        });
      })
      .catch((error) => {
        console.error("Failed to load movement mapping", error);
        setError("Failed to load movement mapping.");
      });
  }, [mappingId, presetId]);

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-8">
        <p className="text-sm text-muted-foreground">{error}</p>
      </main>
    );
  }

  if (!mapping) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-8">
        <p className="text-sm text-muted-foreground">Loading mapping...</p>
      </main>
    );
  }

  return (
    <MovementMappingWorkspace
      key={mapping.details.id}
      title="Edit Mapping"
      description="Review the saved movement and adjust its mapping details."
      initialFrames={mapping.frames}
      initialKeybind={mapping.details.keybind}
      initialName={mapping.details.name}
      initialSelectedLandmarks={mapping.details.selected_landmarks}
      saveError={saveError}
      onSave={async ({ frames, keybind, name, selectedLandmarks }) => {
        setSaveError(null);

        if (!presetId) {
          setSaveError("Cannot save changes because the preset was not found.");
          return;
        }

        try {
          await updateMovementMapping({
            id: mapping.details.id,
            presetId,
            name,
            keybind,
            poseFramesJson: JSON.stringify(frames),
            selectedLandmarks,
          });

          navigate(-1);
        } catch (error) {
          console.error("Failed to update movement mapping", error);
          setSaveError("Failed to save changes. Please try again.");
        }
      }}
    />
  );
}
