import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import MovementMappingWorkspace from "./components/MovementMappingWorkspace";
import { createMovementMapping } from "./api/movementMappingsApi";

export default function MovementMappingPage() {
  const { presetId } = useParams<{ presetId: string }>();
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState<string | null>(null);

  return (
    <MovementMappingWorkspace
      title="Record and Map New Movement"
      description="Capture a physical movement and assign it to a keybind."
      saveError={saveError}
      onSave={async ({ frames, keybind, name }) => {
        setSaveError(null);

        if (!presetId) {
          setSaveError("Cannot save this movement because the preset was not found.");
          return;
        }

        try {
          await createMovementMapping({
            keybind,
            name,
            poseFramesJson: JSON.stringify(frames),
            presetId,
          });

          navigate(-1);
        } catch (error) {
          console.error("Failed to save movement mapping", error);
          setSaveError("Failed to save movement mapping. Please try again.");
        }
      }}
    />
  );
}
