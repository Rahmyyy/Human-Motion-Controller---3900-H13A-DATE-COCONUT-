import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import CameraPreview from "../camera/CameraPreview";
import { useCamera } from "../camera/useCamera";
import MappingDetailsPanel from "./MappingDetailsPanel";

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
  stream: MediaStream | null;
}

function SessionCameraPanel({ stream }: SessionCameraPanelProps) {
  return (
    <section className="grid min-h-0 min-w-0" aria-label="Movement camera preview">
      <CameraPreview stream={stream} />
    </section>
  );
}

export default function SessionPage() {
  const { stream, status, error, start, stop } = useCamera();

  return (
    <main className="grid h-screen w-full grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden bg-slate-50 p-8">
      <SessionHeader />
      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <SessionCameraPanel stream={stream} />
        <MappingDetailsPanel />
      </div>

      <div className="grid w-full justify-items-start gap-3">
        {status === "active" ? (
          <Button type="button" onClick={stop} variant="destructive">
            Stop camera
          </Button>
        ) : (
          <Button type="button" onClick={() => void start()} disabled={status === "starting"}>
            {status === "starting" ? "Starting camera…" : "Start camera"}
          </Button>
        )}

        {error && (
          <p className="m-0 max-w-xl text-center text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
