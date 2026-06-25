import { Button } from "@/components/ui/button";
import CameraPreview from "../camera/CameraPreview";
import { useCamera } from "../camera/useCamera";

function SessionHeader() {
  return (
    <header className="grid gap-1">
      <h1 className="m-0 text-3xl leading-tight font-bold text-gray-800">
        Record and Map New Movement
      </h1>
      <p className="m-0 text-sm leading-6 text-gray-600">
        Capture a physical movement and assign it to a keybind.
      </p>
    </header>
  );
}

interface SessionCameraPanelProps {
  stream: MediaStream | null;
}

function SessionCameraPanel({ stream }: SessionCameraPanelProps) {
  return (
    <section className="grid min-w-0" aria-label="Movement camera preview">
      <CameraPreview stream={stream} />
    </section>
  );
}

export default function SessionPage() {
  const { stream, status, error, start, stop } = useCamera();

  return (
    <main className="grid min-h-screen w-full content-start gap-4 bg-slate-50 p-8">
      <div className="grid w-full max-w-3xl gap-4">
        <SessionHeader />
        <SessionCameraPanel stream={stream} />
      </div>

      <div className="grid w-full max-w-3xl justify-items-start gap-3">
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
