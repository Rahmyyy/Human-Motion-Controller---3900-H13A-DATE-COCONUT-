import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { endSession, getIsRunning, startSession, subscribe } from "@/lib/liveSessionState";

/**
 * TEMPORARY SCAFFOLDING: there is no real "session started/ended" event
 * anywhere else in the app yet, so this panel owns its own Start/Stop button
 * as a stand-in. Subtask 5 (or a future ticket, once a real session
 * lifecycle exists elsewhere) should replace this control with the actual
 * trigger and remove the local state below.
 */
export default function SessionStatusPanel() {
  const isRunning = useSyncExternalStore(subscribe, getIsRunning);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [hasEnded, setHasEnded] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (sessionStartedAt === null) {
      return;
    }

    const intervalId = setInterval(() => {
      setElapsedMs(Date.now() - sessionStartedAt);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [sessionStartedAt]);

  const statusText = isRunning ? "Running" : hasEnded ? "Ended" : "Idle";

  function handleStart() {
    setHasEnded(false);
    setElapsedMs(0);
    setSessionStartedAt(Date.now());
    startSession();
  }

  function handleStop() {
    setSessionStartedAt(null);
    setHasEnded(true);
    endSession();
  }

  return (
    <section className="grid content-start gap-4 rounded-lg border bg-background p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold text-foreground">Session Status</h2>
          <p className="text-sm text-muted-foreground">Current state and elapsed time.</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={isRunning ? "destructive" : "outline"}
          onClick={isRunning ? handleStop : handleStart}
        >
          {isRunning ? "Stop" : "Start"}
        </Button>
      </header>

      <div className="grid gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Status
        </span>
        <span className="text-lg font-semibold text-foreground">{statusText}</span>
      </div>

      <div className="grid gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Duration
        </span>
        <span className="text-lg font-semibold text-foreground">{formatDuration(elapsedMs)}</span>
      </div>
    </section>
  );
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
