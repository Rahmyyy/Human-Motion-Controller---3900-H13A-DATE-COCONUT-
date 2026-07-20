import { useMemo, useState } from "react";
import type { PoseFrame } from "@/features/camera/poseFrame";
import { TRACKED_LANDMARKS } from "@/features/movement-recognition/recognition/types";
import LandmarkSelectionPanel from "./LandmarkSelectionPanel";
import MappingDetailsPanel from "./MappingDetailsPanel";
import type { Keybind } from "./MappingDetailsPanel";
import MovementCameraPanel from "./MovementCameraPanel";
import MovementMappingHeader from "./MovementMappingHeader";
import RecordingControls from "./RecordingControls";
import RecordingQualityPanel from "./RecordingQualityPanel";
import RecordingTrimPanel from "./RecordingTrimPanel";
import { usePoseRecording } from "../hooks/usePoseRecording";
import { analyseRecordingQuality } from "../recording/analyseRecordingQuality";

interface SaveMovementMappingInput {
  frames: PoseFrame[];
  keybind: string;
  name: string;
  selectedLandmarks: number[];
}

interface MovementMappingWorkspaceProps {
  description: string;
  initialFrames?: PoseFrame[];
  initialKeybind?: string;
  initialName?: string;
  initialSelectedLandmarks?: number[];
  onSave: (input: SaveMovementMappingInput) => Promise<void>;
  saveError?: string | null;
  title: string;
}

// Legacy mappings (and brand-new recordings) start with every tracked landmark selected, so
// recognition matches its pre-selection behaviour until the user narrows the set.
function initialSelection(selected: number[] | undefined): number[] {
  return selected && selected.length > 0 ? selected : [...TRACKED_LANDMARKS];
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
  initialSelectedLandmarks,
  onSave,
  saveError = null,
  title,
}: MovementMappingWorkspaceProps) {
  const [movementName, setMovementName] = useState(initialName);
  const [keybind, setKeybind] = useState<Keybind | null>(keybindFromLabel(initialKeybind));
  const [selectedLandmarks, setSelectedLandmarks] = useState<number[]>(() =>
    initialSelection(initialSelectedLandmarks),
  );
  const {
    cancelCountdown,
    countdownSeconds,
    recordFrame,
    recordedFrames,
    recordingTrim,
    recordingState,
    resetRecording,
    startRecording,
    stopRecording,
    trimRecording,
  } = usePoseRecording(initialFrames ?? [], initialFrames ? "recorded" : "idle");

  // Analyse only completed recordings so camera frames do not trigger React work while recording.
  // Re-runs when the landmark selection changes so the quality reflects the current selection.
  const recordingQuality = useMemo(
    () =>
      recordingState === "recorded"
        ? analyseRecordingQuality(recordedFrames, selectedLandmarks)
        : null,
    [recordedFrames, recordingState, selectedLandmarks],
  );

  const handleStopRecording = () => {
    const frames = stopRecording();
    console.log(`Recorded ${frames.length} pose frames`, frames);
  };

  const handleSaveMapping = async () => {
    await onSave({
      frames: recordedFrames,
      keybind: keybind?.label ?? "",
      name: movementName,
      selectedLandmarks,
    });
  };

  return (
    <main className="grid h-screen w-full grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden bg-slate-50 p-8">
      <MovementMappingHeader description={description} title={title} />
      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <MovementCameraPanel
          frames={recordedFrames}
          countdownSeconds={countdownSeconds}
          onPoseFrame={recordFrame}
          recordingState={recordingState}
        />
        <div className="grid min-h-0 content-start gap-4 overflow-y-auto pr-1">
          <MappingDetailsPanel
            keybind={keybind}
            movementName={movementName}
            onKeybindChange={setKeybind}
            onMovementNameChange={setMovementName}
          />
          {recordingState === "recorded" && recordingTrim && (
            <RecordingTrimPanel trim={recordingTrim} onChange={trimRecording} />
          )}
          {recordingQuality && <RecordingQualityPanel quality={recordingQuality} />}
          {/* Optional power-user control: kept below the core record/review flow. Selection is
              independent of the captured frames, so it stays editable before and after a recording
              (including when editing an existing mapping); only locked during an active capture. */}
          <LandmarkSelectionPanel
            value={selectedLandmarks}
            onChange={setSelectedLandmarks}
            disabled={recordingState === "countdown" || recordingState === "recording"}
          />
          {saveError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {saveError}
            </p>
          )}
          <RecordingControls
            state={recordingState}
            canSave={recordingQuality?.status !== "unusable"}
            onCancel={cancelCountdown}
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
