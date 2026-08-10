import { Square } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import SessionSummaryView from "./components/SessionSummaryView";
import { useSessionLauncher } from "./hooks/useSessionLauncher";

/**
 * Main-window view for a running session. The overlay window does the real
 * work - camera, recognition, key presses - so this page only launches it and
 * offers a second way to stop, for when the overlay has been dragged somewhere
 * awkward or the user has tabbed back here.
 */
export default function LiveSessionPage() {
  const { patientId, presetId } = useParams<{ patientId: string; presetId: string }>();
  const navigate = useNavigate();
  const { endSession, error, status, summary } = useSessionLauncher(patientId, presetId);

  if (status === "ended" && summary && patientId && presetId) {
    return (
      <SessionSummaryView
        summary={summary}
        patientId={patientId}
        presetId={presetId}
        onDone={() => navigate("/")}
      />
    );
  }

  return (
    <main className="site-page-gutter grid h-screen place-items-center bg-slate-950 py-8">
      <div className="grid max-w-md justify-items-center gap-4 text-center text-white">
        {error ? (
          <>
            <h1 className="text-xl font-semibold">Session cannot start</h1>
            <p className="text-sm text-white/70">{error}</p>
            <Button type="button" variant="outline" onClick={() => navigate("/")}>
              Back to dashboard
            </Button>
          </>
        ) : (
          <>
            <span className="flex items-center gap-2 text-sm font-medium text-emerald-400">
              <span
                className="size-2 animate-pulse rounded-full bg-emerald-400"
                aria-hidden="true"
              />
              Session running
            </span>
            <h1 className="text-2xl font-semibold">Switch to your game</h1>
            <p className="text-sm text-white/70">
              The overlay stays on top of other windows. Your movements are being sent as key
              presses to whichever window is in focus, so bring your game forward and play.
            </p>
            <Button type="button" variant="destructive" onClick={endSession}>
              <Square className="size-3.5" aria-hidden="true" />
              End Session
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
