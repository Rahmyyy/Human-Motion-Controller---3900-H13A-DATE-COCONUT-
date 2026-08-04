import LandmarkSelectionPanel from "./LandmarkSelectionPanel";
import KeypressTriggerThresholdPanel from "./KeypressTriggerThresholdPanel";
import MappingDetailsPanel from "./MappingDetailsPanel";
import MovementCameraPanel from "@/components/pose-recording/MovementCameraPanel";
import MovementMappingHeader from "./MovementMappingHeader";
import RecordingControls from "@/components/pose-recording/RecordingControls";
import RecordingQualityPanel from "@/components/pose-recording/RecordingQualityPanel";
import RecordingTrimPanel from "@/components/pose-recording/RecordingTrimPanel";
import type { MappingEditorViewModel } from "@/modules/movement-mapping";

interface MovementMappingPresentation {
  backTo: string;
  description: string;
  title: string;
}

interface MovementMappingWorkspaceProps {
  editor: MappingEditorViewModel;
  presentation: MovementMappingPresentation;
}

export default function MovementMappingWorkspace({
  editor,
  presentation: { backTo, description, title },
}: MovementMappingWorkspaceProps) {
  return (
    <main className="grid h-screen w-full grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden bg-slate-50 p-8">
      <MovementMappingHeader backTo={backTo} description={description} title={title} />
      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <MovementCameraPanel
          frames={editor.recordedFrames}
          countdownSeconds={editor.countdownSeconds}
          recordingState={editor.recordingState}
        />
        <div className="grid min-h-0 content-start gap-4 overflow-y-auto pr-1">
          <MappingDetailsPanel
            keybind={editor.keybind}
            keypressType={editor.keypressType}
            movementName={editor.movementName}
            onKeybindChange={editor.setKeybind}
            onKeypressTypeChange={editor.setKeypressType}
            onMovementNameChange={editor.setMovementName}
          />
          {editor.recordingState === "recorded" && editor.recordingTrim && (
            <RecordingTrimPanel trim={editor.recordingTrim} onChange={editor.trimRecording} />
          )}
          {editor.recordingQuality && <RecordingQualityPanel quality={editor.recordingQuality} />}
          {/* Optional power-user control: kept below the core record/review flow. Selection is
              independent of the captured frames, so it stays editable before and after a recording
              (including when editing an existing mapping); only locked during an active capture. */}
          <LandmarkSelectionPanel
            value={editor.selectedLandmarks}
            onChange={editor.setSelectedLandmarks}
            disabled={
              editor.recordingState === "countdown" || editor.recordingState === "recording"
            }
          />
          <KeypressTriggerThresholdPanel
            value={editor.keypressTriggerThresholdPercentage}
            onChange={editor.setKeypressTriggerThreshold}
          />
          {editor.error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {editor.error}
            </p>
          )}
          <RecordingControls
            state={editor.recordingState}
            canSave={editor.canSave}
            onCancel={editor.cancelCountdown}
            onReRecord={editor.resetRecording}
            onSave={editor.save}
            onStart={editor.startRecording}
            onStop={editor.stopRecording}
          />
        </div>
      </div>
    </main>
  );
}
