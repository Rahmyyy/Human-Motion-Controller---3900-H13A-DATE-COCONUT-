import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import MovementMappingWorkspace from "./components/MovementMappingWorkspace";
import { useMappingEditor } from "./hooks/useMappingEditor";

export default function MovementMappingPage() {
  const { patientId, presetId } = useParams<{ patientId: string; presetId: string }>();
  const navigate = useNavigate();
  const editor = useMappingEditor(patientId, presetId);

  useEffect(() => {
    if (editor.status === "needs-calibration" && presetId) {
      navigate(`/patients/${patientId}/presets/${presetId}/default-pose`, { replace: true });
    } else if (editor.status === "saved" && presetId) {
      navigate(`/patients/${patientId}/presets/${presetId}/edit`);
    }
  }, [editor.status, navigate, patientId, presetId]);

  if (editor.status !== "ready" && editor.status !== "saving") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-8">
        <p className="text-sm text-muted-foreground">
          {editor.error ?? "Checking default-pose calibration..."}
        </p>
      </main>
    );
  }

  return (
    <MovementMappingWorkspace
      backTo={`/patients/${patientId}/presets/${presetId}/edit`}
      title="Record and Map New Movement"
      description="Capture a physical movement and assign it to a keybind."
      canSave={editor.canSave}
      countdownSeconds={editor.countdownSeconds}
      error={editor.error}
      keybind={editor.keybind}
      keypressType={editor.keypressType}
      keypressTriggerThresholdPercentage={editor.keypressTriggerThresholdPercentage}
      movementName={editor.movementName}
      onCancelCountdown={editor.cancelCountdown}
      onKeybindChange={editor.setKeybind}
      onKeypressTypeChange={editor.setKeypressType}
      onKeypressTriggerThresholdChange={editor.setKeypressTriggerThreshold}
      onMovementNameChange={editor.setMovementName}
      onResetRecording={editor.resetRecording}
      onSave={editor.save}
      onSelectedLandmarksChange={editor.setSelectedLandmarks}
      onStartRecording={editor.startRecording}
      onStopRecording={editor.stopRecording}
      onTrimRecording={editor.trimRecording}
      recordedFrames={editor.recordedFrames}
      recordingQuality={editor.recordingQuality}
      recordingState={editor.recordingState}
      recordingTrim={editor.recordingTrim}
      selectedLandmarks={editor.selectedLandmarks}
    />
  );
}
