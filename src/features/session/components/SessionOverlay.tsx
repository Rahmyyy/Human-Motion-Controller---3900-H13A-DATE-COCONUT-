import { GripHorizontal, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecognitionStatus } from "@/features/movement-recognition/hooks/useMovementRecognition";

interface SessionOverlayProps {
  presetName: string;
  status: RecognitionStatus;
  elapsedMs: number;
  triggerCount: number;
  onStop: () => void;
  children?: React.ReactNode;
}

/**
 * Heads-up display for a running session. Lives in its own always-on-top
 * window, so it is laid out as a single narrow column sized to that window
 * rather than as a page. Everything visible here mirrors the live dashboard:
 * mappings, keybinds, confidence, duration and trigger count.
 */
export default function SessionOverlay({
  presetName,
  status,
  elapsedMs,
  triggerCount,
  onStop,
  children,
}: SessionOverlayProps) {
  return (
    <div className="grid h-screen grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-3 overflow-hidden rounded-xl border border-white/15 bg-slate-900/85 p-3 text-white shadow-2xl backdrop-blur-md">
      {/* Dragging the header moves the whole overlay, so it can be nudged off
          whatever part of the game the user needs to see. "deep" is required:
          a bare data-tauri-drag-region only fires when the mousedown target is
          this element itself, so the icon and label below would swallow it. */}
      <header
        data-tauri-drag-region="deep"
        className="flex cursor-grab items-center gap-2 active:cursor-grabbing"
      >
        <GripHorizontal className="size-4 shrink-0 text-white/40" aria-hidden="true" />
        <span
          className="size-2 shrink-0 animate-pulse rounded-full bg-emerald-400"
          aria-hidden="true"
        />
        <span className="truncate text-sm font-medium">{presetName}</span>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Duration" value={formatDuration(elapsedMs)} />
        <Stat label="Triggers" value={String(triggerCount)} />
      </div>

      <section
        className="grid content-start gap-2 overflow-y-auto"
        aria-label="Movement recognition"
      >
        {status.mappingStatuses.length > 0 ? (
          <ul className="grid gap-2">
            {status.mappingStatuses.map((mapping) => (
              <li
                key={mapping.id}
                className={cn(
                  "grid gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5",
                  mapping.isActive && "border-emerald-400/60 bg-emerald-400/15",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{mapping.name}</span>
                  <kbd className="shrink-0 rounded bg-white/15 px-1.5 py-0.5 font-mono text-xs font-semibold">
                    {mapping.keybind}
                  </kbd>
                </div>
                <div className="flex items-center gap-2">
                  <ConfidenceBar confidence={mapping.confidence} isActive={mapping.isActive} />
                  <span className="w-9 shrink-0 text-right text-xs tabular-nums text-white/70">
                    {formatConfidence(mapping.confidence)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/60">No mappings saved.</p>
        )}

        {status.waitingForDefaultPose && (
          <p className="rounded-md bg-amber-400/15 p-2 text-xs text-amber-200">
            Return to the default resting pose to re-arm.
          </p>
        )}

        {status.error && (
          <p className="rounded-md bg-red-500/25 p-2 text-xs text-red-200">{status.error}</p>
        )}
      </section>

      {children}

      <Button type="button" size="sm" variant="destructive" onClick={onStop}>
        <Square className="size-3.5" aria-hidden="true" />
        End Session
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 rounded-lg bg-white/5 p-2">
      <span className="text-[0.625rem] font-medium uppercase tracking-wide text-white/50">
        {label}
      </span>
      <span className="text-base font-semibold leading-none tabular-nums">{value}</span>
    </div>
  );
}

function ConfidenceBar({
  confidence,
  isActive,
}: {
  confidence: number | undefined;
  isActive: boolean;
}) {
  const percent = Math.round(Math.min(Math.max(confidence ?? 0, 0), 1) * 100);

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          isActive ? "bg-emerald-400" : "bg-sky-400",
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatConfidence(confidence: number | undefined) {
  if (confidence === undefined) {
    return "0%";
  }

  return `${Math.round(confidence * 100)}%`;
}
