import BackButton from "@/components/BackButton";
import type { DefaultPoseCalibrationViewModel } from "@/modules/patient-presets";
import MovementCameraPanel from "@/components/pose-recording/MovementCameraPanel";
import RecordingControls from "@/components/pose-recording/RecordingControls";
import RecordingQualityPanel from "@/components/pose-recording/RecordingQualityPanel";
import RecordingTrimPanel from "@/components/pose-recording/RecordingTrimPanel";

type Props = {
  backTo: string;
  calibration: DefaultPoseCalibrationViewModel;
};

export default function DefaultPoseCalibrationWorkspace({ backTo, calibration }: Props) {
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
        <BackButton to={backTo} />
      </header>

      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <MovementCameraPanel
          countdownSeconds={calibration.countdownSeconds}
          frames={calibration.recordedFrames}
          recordingState={calibration.recordingState}
        />
        <div className="grid min-h-0 content-start gap-4 overflow-y-auto pr-1">
          <section className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            Record at least one second with the patient fully visible. Re-record this calibration if
            the camera position or the patient's resting posture changes significantly.
          </section>
          {calibration.recordingState === "recorded" && calibration.recordingTrim && (
            <RecordingTrimPanel
              trim={calibration.recordingTrim}
              onChange={calibration.trimRecording}
            />
          )}
          {calibration.recordingQuality && (
            <RecordingQualityPanel quality={calibration.recordingQuality} />
          )}
          {calibration.error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {calibration.error}
            </p>
          )}
          <RecordingControls
            state={calibration.recordingState}
            canSave={calibration.canSave}
            onCancel={calibration.cancelCountdown}
            onReRecord={calibration.resetRecording}
            onSave={calibration.save}
            onStart={calibration.startRecording}
            onStop={calibration.stopRecording}
            saveLabel="Save Default State"
            startLabel="Start Calibration"
          />
        </div>
      </div>
    </main>
  );
}
