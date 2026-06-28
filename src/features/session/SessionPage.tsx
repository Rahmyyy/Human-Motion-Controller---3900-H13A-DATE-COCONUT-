import BackButton from "@/components/BackButton";
import type { PoseFrame } from "../camera/poseFrame";
import MediaPipePosePreview from "../camera/MediaPipePosePreview";
import MappingDetailsPanel from "./MappingDetailsPanel";
import PoseReplay from "./PoseReplay";
import RecordingControls from "./RecordingControls";
import type { RecordingState } from "./usePoseRecording";
import { usePoseRecording } from "./usePoseRecording";

function SessionHeader() {
  return (
    <header className="flex items-start justify-between gap-6">
      <div className="grid gap-1">
        <h1 className="m-0 text-3xl leading-tight font-bold text-gray-800">
          Record and Map New Movement
        </h1>
        <p className="m-0 text-sm leading-6 text-gray-600">
          Capture a physical movement and assign it to a keybind.
        </p>
      </div>
      <BackButton />
    </header>
  );
}

interface SessionCameraPanelProps {
  frames: PoseFrame[];
  onPoseFrame: (frame: PoseFrame) => void;
  recordingState: RecordingState;
}

function SessionCameraPanel({ frames, onPoseFrame, recordingState }: SessionCameraPanelProps) {
  return (
    <section className="grid min-h-0 min-w-0" aria-label="Movement camera preview">
      {recordingState === "recorded" ? (
        <PoseReplay frames={frames} />
      ) : (
        <MediaPipePosePreview onPoseFrame={onPoseFrame} />
      )}
    </section>
  );
}

export default function SessionPage() {
  const {
    recordFrame,
    recordedFrames,
    recordingState,
    resetRecording,
    startRecording,
    stopRecording,
  } = usePoseRecording();

  const handleStopRecording = () => {
    const frames = stopRecording();
    console.log(`Recorded ${frames.length} pose frames`, frames);
  };

  const handleSaveMapping = () => {
    console.log("Save mapping clicked", { frames: recordedFrames });
  };

  return (
    <main className="grid h-screen w-full grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden bg-slate-50 p-8">
      <SessionHeader />
      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <SessionCameraPanel
          frames={recordedFrames}
          onPoseFrame={recordFrame}
          recordingState={recordingState}
        />
        <div className="grid min-h-0 content-start gap-4">
          <MappingDetailsPanel />
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
