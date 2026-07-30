import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import MovementMappingWorkspace from "./components/MovementMappingWorkspace";
import { useMappingEditor } from "./hooks/useMappingEditor";

export default function EditMovementMappingPage() {
  const { mappingId, patientId, presetId } = useParams<{
    mappingId: string;
    patientId: string;
    presetId: string;
  }>();
  const navigate = useNavigate();
  const editor = useMappingEditor(patientId, presetId, mappingId);

  useEffect(() => {
    if (editor.status === "saved" && patientId && presetId) {
      navigate(`/patients/${patientId}/presets/${presetId}/edit`);
    }
  }, [editor.status, navigate, patientId, presetId]);

  if (editor.status === "error") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-8">
        <p className="text-sm text-muted-foreground">{editor.error}</p>
      </main>
    );
  }

  if (editor.status !== "ready" && editor.status !== "saving") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-8">
        <p className="text-sm text-muted-foreground">Loading mapping...</p>
      </main>
    );
  }

  return (
    <MovementMappingWorkspace
      backTo={`/patients/${patientId}/presets/${presetId}/edit`}
      title="Edit Mapping"
      description="Review the saved movement and adjust its mapping details."
      canSave={editor.canSave}
      countdownSeconds={editor.countdownSeconds}
      error={editor.error}
      keybind={editor.keybind}
      movementName={editor.movementName}
      onCancelCountdown={editor.cancelCountdown}
      onKeybindChange={editor.setKeybind}
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
