import BackButton from "@/components/BackButton";
import type { PoseFrame } from "../camera/poseFrame";
import MediaPipePosePreview from "../camera/MediaPipePosePreview";
import MappingDetailsPanel from "./MappingDetailsPanel";
import RecordingControls from "./RecordingControls";
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

function SessionCameraPanel({ onPoseFrame }: { onPoseFrame: (frame: PoseFrame) => void }) {
  return (
    <section className="grid min-h-0 min-w-0" aria-label="Movement camera preview">
      <MediaPipePosePreview onPoseFrame={onPoseFrame} />
    </section>
  );
}

export default function SessionPage() {
  const { isRecording, startRecording, stopRecording, recordFrame } = usePoseRecording();

  const handleToggleRecording = () => {
    if (isRecording) {
      const frames = stopRecording();
      console.log(`Recorded ${frames.length} pose frames`, frames);
    } else {
      startRecording();
    }
  };

  return (
    <main className="grid h-screen w-full grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden bg-slate-50 p-8">
      <SessionHeader />
      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <SessionCameraPanel onPoseFrame={recordFrame} />
        <div className="grid min-h-0 content-start gap-4">
          <MappingDetailsPanel />
          <RecordingControls isRecording={isRecording} onToggle={handleToggleRecording} />
        </div>
      </div>
    </main>
  );
}
