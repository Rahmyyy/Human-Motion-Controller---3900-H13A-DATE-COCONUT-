import BackButton from "@/components/BackButton";
import type { PoseFrame } from "@/features/camera/poseFrame";
import MovementCameraPanel from "@/features/movement-mapping/components/MovementCameraPanel";
import RecordingControls from "@/features/movement-mapping/components/RecordingControls";
import RecordingQualityPanel from "@/features/movement-mapping/components/RecordingQualityPanel";
import RecordingTrimPanel from "@/features/movement-mapping/components/RecordingTrimPanel";
import type { RecordingQuality } from "@/features/movement-mapping/recording/analyseRecordingQuality";
import type { RecordingTrimRange } from "@/features/movement-mapping/recording/trimRecording";
import type { RecordingState } from "@/features/movement-mapping/services/recordingService.types";

type Props = {
  canSave: boolean;
  countdownSeconds: number | null;
  error: string | null;
  onCancelCountdown: () => void;
  onResetRecording: () => void;
  onSave: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onTrimRecording: (range: RecordingTrimRange) => void;
  recordedFrames: PoseFrame[];
  recordingQuality: RecordingQuality | null;
  recordingState: RecordingState;
  recordingTrim: RecordingTrimRange | null;
};

export default function DefaultPoseCalibrationWorkspace({
  canSave,
  countdownSeconds,
  error,
  onCancelCountdown,
  onResetRecording,
  onSave,
  onStartRecording,
  onStopRecording,
  onTrimRecording,
  recordedFrames,
  recordingQuality,
  recordingState,
  recordingTrim,
}: Props) {
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
          recordingState={recordingState}
        />
        <div className="grid min-h-0 content-start gap-4 overflow-y-auto pr-1">
          <section className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            Record at least one second with the patient fully visible. Re-record this calibration if
            the camera position or the patient's resting posture changes significantly.
          </section>
          {recordingState === "recorded" && recordingTrim && (
            <RecordingTrimPanel trim={recordingTrim} onChange={onTrimRecording} />
          )}
          {recordingQuality && <RecordingQualityPanel quality={recordingQuality} />}
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
            saveLabel="Save Default State"
            startLabel="Start Calibration"
          />
        </div>
      </div>
    </main>
  );
}
