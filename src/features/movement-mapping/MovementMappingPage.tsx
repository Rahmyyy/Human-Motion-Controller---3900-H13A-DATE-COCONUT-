import MappingDetailsPanel from "./components/MappingDetailsPanel";
import MovementCameraPanel from "./components/MovementCameraPanel";
import MovementMappingHeader from "./components/MovementMappingHeader";
import RecordingControls from "./components/RecordingControls";
import { usePoseRecording } from "./hooks/usePoseRecording";

export default function MovementMappingPage() {
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
      <MovementMappingHeader />
      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <MovementCameraPanel
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
