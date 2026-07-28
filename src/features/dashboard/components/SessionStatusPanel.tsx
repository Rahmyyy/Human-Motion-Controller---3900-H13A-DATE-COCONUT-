import { Button } from "@/components/ui/button";
import { useSession } from "@/features/session/hooks/useSession";

// This standalone dashboard controls the session service in its own webview.
// The always-on-top overlay uses a separate service instance in its webview.
export default function SessionStatusPanel() {
  const { elapsedMs, endSession, startSession, status: sessionStatus } = useSession();

  const statusText =
    sessionStatus === "running" ? "Running" : sessionStatus === "ended" ? "Ended" : "Idle";
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
          onClick={sessionStatus === "running" ? endSession : startSession}
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
