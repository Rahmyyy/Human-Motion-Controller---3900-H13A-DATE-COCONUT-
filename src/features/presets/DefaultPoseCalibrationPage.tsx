import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import DefaultPoseCalibrationWorkspace from "./components/DefaultPoseCalibrationWorkspace";
import { useDefaultPoseCalibration } from "./hooks/useDefaultPoseCalibration";

export default function DefaultPoseCalibrationPage() {
  const { patientId, presetId } = useParams<{ patientId: string; presetId: string }>();
  const navigate = useNavigate();
  const calibration = useDefaultPoseCalibration(patientId, presetId);

  useEffect(() => {
    if (calibration.status === "saved" && presetId) {
      navigate(`/patients/${patientId}/presets/${presetId}/edit`);
    }
  }, [calibration.status, navigate, patientId, presetId]);

  if (calibration.status === "error") {
    return <CalibrationMessage message={calibration.error ?? "Preset not found."} />;
  }

  if (calibration.status !== "ready" && calibration.status !== "saving") {
    return <CalibrationMessage message="Loading calibration..." />;
  }

  return (
    <DefaultPoseCalibrationWorkspace
      backTo={`/patients/${patientId}/presets/${presetId}/edit`}
      canSave={calibration.canSave}
      countdownSeconds={calibration.countdownSeconds}
      error={calibration.error}
      onCancelCountdown={calibration.cancelCountdown}
      onResetRecording={calibration.resetRecording}
      onSave={calibration.save}
      onStartRecording={calibration.startRecording}
      onStopRecording={calibration.stopRecording}
      onTrimRecording={calibration.trimRecording}
      recordedFrames={calibration.recordedFrames}
      recordingQuality={calibration.recordingQuality}
      recordingState={calibration.recordingState}
      recordingTrim={calibration.recordingTrim}
    />
  );
}

function CalibrationMessage({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-8">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
