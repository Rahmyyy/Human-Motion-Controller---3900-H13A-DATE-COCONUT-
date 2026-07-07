import { useState } from "react";
import type { PoseFrame } from "@/features/camera/poseFrame";
import MappingDetailsPanel from "./MappingDetailsPanel";
import type { Keybind } from "./MappingDetailsPanel";
import MovementCameraPanel from "./MovementCameraPanel";
import MovementMappingHeader from "./MovementMappingHeader";
import RecordingControls from "./RecordingControls";
import { usePoseRecording } from "../hooks/usePoseRecording";

interface SaveMovementMappingInput {
  frames: PoseFrame[];
  keybind: string;
  name: string;
}

interface MovementMappingWorkspaceProps {
  description: string;
  initialFrames?: PoseFrame[];
  initialKeybind?: string;
  initialName?: string;
  onSave: (input: SaveMovementMappingInput) => Promise<void>;
  saveError?: string | null;
  title: string;
}

function keybindFromLabel(label: string | undefined): Keybind | null {
  if (!label) return null;

  return {
    code: label,
    label,
  };
}

export default function MovementMappingWorkspace({
  description,
  initialFrames,
  initialKeybind,
  initialName = "",
  onSave,
  saveError = null,
  title,
}: MovementMappingWorkspaceProps) {
  const [movementName, setMovementName] = useState(initialName);
  const [keybind, setKeybind] = useState<Keybind | null>(keybindFromLabel(initialKeybind));
  const {
    recordFrame,
    recordedFrames,
    recordingState,
    resetRecording,
    startRecording,
    stopRecording,
  } = usePoseRecording(initialFrames ?? [], initialFrames ? "recorded" : "idle");

  const handleStopRecording = () => {
    const frames = stopRecording();
    console.log(`Recorded ${frames.length} pose frames`, frames);
  };

  const handleSaveMapping = async () => {
    await onSave({
      frames: recordedFrames,
      keybind: keybind?.label ?? "",
      name: movementName,
    });
  };

  return (
    <main className="grid h-screen w-full grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden bg-slate-50 p-8">
      <MovementMappingHeader description={description} title={title} />
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
          {saveError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {saveError}
            </p>
          )}
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
