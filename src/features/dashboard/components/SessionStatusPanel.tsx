import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  endSession,
  getElapsedMs,
  getEndedAt,
  getSessionStatus,
  getStartedAt,
  startSession,
  subscribe,
} from "@/lib/liveSessionState";

/**
 * TEMPORARY SCAFFOLDING: there is no real "session started/ended" event
 * anywhere else in the app yet, so this panel owns its own Start/Stop button
 * as a stand-in. A future ticket, once a real session lifecycle exists
 * elsewhere, should replace this control with the actual trigger.
 */
export default function SessionStatusPanel() {
  const sessionStatus = useSyncExternalStore(subscribe, getSessionStatus);
  const startedAt = useSyncExternalStore(subscribe, getStartedAt);
  const endedAt = useSyncExternalStore(subscribe, getEndedAt);

  // Forces a re-render once a second while running so the duration display
  // keeps ticking. The count itself is meaningless and resetting it on
  // remount is harmless — elapsed time is always recomputed from the
  // timestamps above, never from this counter.
  const [, tick] = useState(0);

  useEffect(() => {
    if (sessionStatus !== "running") {
      return;
    }

    const intervalId = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(intervalId);
  }, [sessionStatus]);

  const statusText =
    sessionStatus === "running" ? "Running" : sessionStatus === "ended" ? "Ended" : "Idle";
  const elapsedMs = getElapsedMs(sessionStatus, startedAt, endedAt);

  function handleStart() {
    startSession();
  }

  function handleStop() {
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
          variant={sessionStatus === "running" ? "destructive" : "outline"}
          onClick={sessionStatus === "running" ? handleStop : handleStart}
        >
          {sessionStatus === "running" ? "Stop" : "Start"}
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
