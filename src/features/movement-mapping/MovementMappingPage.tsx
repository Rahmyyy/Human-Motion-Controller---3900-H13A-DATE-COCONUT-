import { useNavigate } from "react-router";
import MovementMappingWorkspace from "./components/MovementMappingWorkspace";
import { createMovementMapping } from "./api/movementMappingsApi";

export default function MovementMappingPage() {
  const navigate = useNavigate();

  return (
    <MovementMappingWorkspace
      title="Record and Map New Movement"
      description="Capture a physical movement and assign it to a keybind."
      onSave={async ({ frames, keybind, name }) => {
        console.log("Save mapping clicked", {
          frames,
          keybind,
          name,
        });

        try {
          await createMovementMapping({
            keybind,
            name,
            poseFramesJson: JSON.stringify(frames),
            presetId: "preset-1",
          });

          navigate(-1);
        } catch (error) {
          console.error("Failed to save movement mapping", error);
        }
      }}
    />
  );
}
