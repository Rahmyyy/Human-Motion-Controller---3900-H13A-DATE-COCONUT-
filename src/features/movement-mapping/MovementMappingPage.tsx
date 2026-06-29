import { useNavigate } from "react-router";
import { useState } from "react";
import MappingDetailsPanel from "./components/MappingDetailsPanel";
import type { Keybind } from "./components/MappingDetailsPanel";
import MovementCameraPanel from "./components/MovementCameraPanel";
import MovementMappingHeader from "./components/MovementMappingHeader";
import RecordingControls from "./components/RecordingControls";
import { createMovementMapping } from "./api/movementMappingsApi";
import { usePoseRecording } from "./hooks/usePoseRecording";

export default function MovementMappingPage() {
  const navigate = useNavigate();
  const [movementName, setMovementName] = useState("");
  const [keybind, setKeybind] = useState<Keybind | null>(null);
  const {
    recordFrame,
    recordedFrames,
    recordingState,
    resetRecording,
    startRecording,
    stopRecording,
  } = usePoseRecording();

  const handleStopRecording = () => {
    const frames = stopRecording();
    console.log(`Recorded ${frames.length} pose frames`, frames);
  };

  const handleSaveMapping = async () => {
    console.log("Save mapping clicked", {
      frames: recordedFrames,
      keybind,
      name: movementName,
    });

    try {
      await createMovementMapping({
        keybind: keybind?.label ?? "",
        name: movementName,
        poseFramesJson: JSON.stringify(recordedFrames),
        presetId: "preset-1",
      });

      navigate(-1);
    } catch (error) {
      console.error("Failed to save movement mapping", error);
    }
  };

  return (
    <main className="grid h-screen w-full grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden bg-slate-50 p-8">
      <MovementMappingHeader />
      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <MovementCameraPanel
          frames={recordedFrames}
          onPoseFrame={recordFrame}
          recordingState={recordingState}
        />
        <div className="grid min-h-0 content-start gap-4">
          <MappingDetailsPanel
            keybind={keybind}
            movementName={movementName}
            onKeybindChange={setKeybind}
            onMovementNameChange={setMovementName}
          />
          <RecordingControls
            state={recordingState}
            onReRecord={resetRecording}
            onSave={handleSaveMapping}
            onStart={startRecording}
            onStop={handleStopRecording}
          />
        </div>
      </div>
    </main>
  );
}
