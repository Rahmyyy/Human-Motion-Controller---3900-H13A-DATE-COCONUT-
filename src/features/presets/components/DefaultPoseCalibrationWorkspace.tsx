import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import BackButton from "@/components/BackButton";
import type { PoseFrame } from "@/features/camera/poseFrame";
import MovementCameraPanel from "@/features/movement-mapping/components/MovementCameraPanel";
import RecordingControls from "@/features/movement-mapping/components/RecordingControls";
import RecordingQualityPanel from "@/features/movement-mapping/components/RecordingQualityPanel";
import RecordingTrimPanel from "@/features/movement-mapping/components/RecordingTrimPanel";
import { usePoseRecording } from "@/features/movement-mapping/hooks/usePoseRecording";
import { analyseRecordingQuality } from "@/features/movement-mapping/recording/analyseRecordingQuality";
import { updateDefaultPose, type Preset } from "../api/presetsApi";

type Props = {
  initialFrames: PoseFrame[];
  patientId: string;
  preset: Preset;
};

export default function DefaultPoseCalibrationWorkspace({
  initialFrames,
  patientId,
  preset,
}: Props) {
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState<string | null>(null);
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
  } = usePoseRecording(initialFrames, initialFrames.length > 0 ? "recorded" : "idle");
  const quality = useMemo(
    () => (recordingState === "recorded" ? analyseRecordingQuality(recordedFrames) : null),
    [recordedFrames, recordingState],
  );

  const saveCalibration = async () => {
    setSaveError(null);
    try {
      await updateDefaultPose(preset.id, patientId, JSON.stringify(recordedFrames));

      navigate(`/patients/${patientId}/presets/${preset.id}/edit`);
    } catch (error) {
      console.error("Failed to save default pose", error);
      setSaveError("Failed to save the default pose. Please try again.");
    }
  };

  return (
    <main className="grid h-screen w-full grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden bg-slate-50 p-8">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Record Default Resting State
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Ask the patient to remain comfortably still in their normal resting position. This
            calibration helps recognition separate rest from intentional movement.
          </p>
        </div>
        <BackButton />
      </header>

      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <MovementCameraPanel
          countdownSeconds={countdownSeconds}
          frames={recordedFrames}
          onPoseFrame={recordFrame}
          recordingState={recordingState}
        />
        <div className="grid min-h-0 content-start gap-4 overflow-y-auto pr-1">
          <section className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            Record at least one second with the patient fully visible. Re-record this calibration if
            the camera position or the patient's resting posture changes significantly.
          </section>
          {recordingState === "recorded" && recordingTrim && (
            <RecordingTrimPanel trim={recordingTrim} onChange={trimRecording} />
          )}
          {quality && <RecordingQualityPanel quality={quality} />}
          {saveError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {saveError}
            </p>
          )}
          <RecordingControls
            state={recordingState}
            canSave={quality?.status !== "unusable"}
            onCancel={cancelCountdown}
            onReRecord={resetRecording}
            onSave={saveCalibration}
            onStart={startRecording}
            onStop={stopRecording}
            saveLabel="Save Default State"
            startLabel="Start Calibration"
          />
        </div>
      </div>
    </main>
  );
}
