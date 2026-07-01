import { getMovementMapping } from "@/features/movement-mapping/api/movementMappingsApi";
import type { MovementMappingDetailsResponse } from "@/features/movement-mapping/api/movementMappingsApi";
import type { PoseFrame } from "@/features/camera/poseFrame";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import MovementMappingWorkspace from "./components/MovementMappingWorkspace";

interface LoadedMovementMapping {
  details: MovementMappingDetailsResponse;
  frames: PoseFrame[];
}

export default function EditMovementMappingPage() {
  const { mappingId } = useParams();
  const [mapping, setMapping] = useState<LoadedMovementMapping | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mappingId) return;

    getMovementMapping(mappingId, "preset-1")
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
  }, [mappingId]);

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
      onSave={async ({ frames, keybind, name }) => {
        console.log("Edit mapping save clicked", {
          frames,
          id: mapping.details.id,
          keybind,
          name,
        });
      }}
    />
  );
}
