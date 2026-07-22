import type { PoseFrame } from "@/features/camera/poseFrame";
import LandmarkSelectionPanel from "./LandmarkSelectionPanel";
import MappingDetailsPanel from "./MappingDetailsPanel";
import MovementCameraPanel from "./MovementCameraPanel";
import MovementMappingHeader from "./MovementMappingHeader";
import RecordingControls from "./RecordingControls";
import RecordingQualityPanel from "./RecordingQualityPanel";
import RecordingTrimPanel from "./RecordingTrimPanel";
import type { RecordingQuality } from "../recording/analyseRecordingQuality";
import type { RecordingTrimRange } from "../recording/trimRecording";
import type { Keybind } from "../services/mappingEditorService.types";
import type { RecordingState } from "../services/recordingService.types";

interface MovementMappingWorkspaceProps {
  description: string;
  canSave: boolean;
  countdownSeconds: number | null;
  error: string | null;
  keybind: Keybind | null;
  movementName: string;
  onCancelCountdown: () => void;
  onKeybindChange: (keybind: Keybind) => void;
  onMovementNameChange: (name: string) => void;
  onResetRecording: () => void;
  onSave: () => void;
  onSelectedLandmarksChange: (landmarks: number[]) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onTrimRecording: (range: RecordingTrimRange) => void;
  recordedFrames: PoseFrame[];
  recordingQuality: RecordingQuality | null;
  recordingState: RecordingState;
  recordingTrim: RecordingTrimRange | null;
  selectedLandmarks: number[];
  title: string;
}

export default function MovementMappingWorkspace({
  canSave,
  countdownSeconds,
  description,
  error,
  keybind,
  movementName,
  onCancelCountdown,
  onKeybindChange,
  onMovementNameChange,
  onResetRecording,
  onSave,
  onSelectedLandmarksChange,
  onStartRecording,
  onStopRecording,
  onTrimRecording,
  recordedFrames,
  recordingQuality,
  recordingState,
  recordingTrim,
  selectedLandmarks,
  title,
}: MovementMappingWorkspaceProps) {
  return (
    <main className="grid h-screen w-full grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden bg-slate-50 p-8">
      <MovementMappingHeader description={description} title={title} />
      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <MovementCameraPanel
          frames={recordedFrames}
          countdownSeconds={countdownSeconds}
          recordingState={recordingState}
        />
        <div className="grid min-h-0 content-start gap-4 overflow-y-auto pr-1">
          <MappingDetailsPanel
            keybind={keybind}
            movementName={movementName}
            onKeybindChange={onKeybindChange}
            onMovementNameChange={onMovementNameChange}
          />
          {recordingState === "recorded" && recordingTrim && (
            <RecordingTrimPanel trim={recordingTrim} onChange={onTrimRecording} />
          )}
          {recordingQuality && <RecordingQualityPanel quality={recordingQuality} />}
          {/* Optional power-user control: kept below the core record/review flow. Selection is
              independent of the captured frames, so it stays editable before and after a recording
              (including when editing an existing mapping); only locked during an active capture. */}
          <LandmarkSelectionPanel
            value={selectedLandmarks}
            onChange={onSelectedLandmarksChange}
            disabled={recordingState === "countdown" || recordingState === "recording"}
          />
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <RecordingControls
            state={recordingState}
            canSave={canSave}
            onCancel={onCancelCountdown}
            onReRecord={onResetRecording}
            onSave={onSave}
            onStart={onStartRecording}
            onStop={onStopRecording}
          />
        </div>
      </div>
    </main>
  );
}
