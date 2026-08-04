import { ChevronDown, PersonStanding } from "lucide-react";
import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { TRACKED_LANDMARKS } from "@/modules/pose-capture";
import {
  LANDMARK_DIAGRAM_CONNECTIONS,
  LANDMARK_DIAGRAM_HEIGHT,
  LANDMARK_DIAGRAM_NODES,
  LANDMARK_DIAGRAM_WIDTH,
} from "../landmarks/landmarkDiagram";

interface LandmarkSelectionPanelProps {
  value: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
}

const NODE_BY_INDEX = new Map(LANDMARK_DIAGRAM_NODES.map((node) => [node.index, node]));
const TOTAL_LANDMARKS = TRACKED_LANDMARKS.length;

export default function LandmarkSelectionPanel({
  value,
  onChange,
  disabled = false,
}: LandmarkSelectionPanelProps) {
  const selected = new Set(value);
  const summary =
    selected.size === TOTAL_LANDMARKS
      ? "Using all body points"
      : selected.size === 0
        ? "No points selected"
        : `Focusing on ${selected.size} of ${TOTAL_LANDMARKS} points`;

  const toggle = (index: number) => {
    if (disabled) return;

    const next = new Set(value);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    onChange([...next]);
  };

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>, index: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle(index);
    }
  };

  return (
    <section className="rounded-lg border bg-background shadow-sm">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
          <PersonStanding className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="m-0 flex items-center gap-2 text-base font-semibold text-foreground">
              Relevant Landmarks
              <span className="rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Optional
              </span>
            </h2>
            <p className="m-0 text-xs text-muted-foreground">{summary}</p>
          </div>
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>

        <div className="grid gap-4 px-5 pb-5">
          <p className="m-0 text-sm text-muted-foreground">
            Narrow recognition to the joints this movement depends on. Leave everything selected to
            use the whole body.
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {selected.size} of {TOTAL_LANDMARKS} selected
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                className="font-medium text-primary hover:underline disabled:opacity-50"
                onClick={() => onChange([...TRACKED_LANDMARKS])}
                disabled={disabled}
              >
                Select all
              </button>
              <button
                type="button"
                className="font-medium text-primary hover:underline disabled:opacity-50"
                onClick={() => onChange([])}
                disabled={disabled}
              >
                Clear
              </button>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${LANDMARK_DIAGRAM_WIDTH} ${LANDMARK_DIAGRAM_HEIGHT}`}
            className={cn(
              "mx-auto h-64 w-auto select-none",
              disabled && "pointer-events-none opacity-60",
            )}
            role="group"
            aria-label="Body landmark selector"
          >
            {LANDMARK_DIAGRAM_CONNECTIONS.map(([start, end]) => {
              const from = NODE_BY_INDEX.get(start);
              const to = NODE_BY_INDEX.get(end);
              if (!from || !to) return null;

              return (
                <line
                  key={`${start}-${end}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className="stroke-muted-foreground/30"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              );
            })}

            {LANDMARK_DIAGRAM_NODES.map((node) => {
              const isSelected = selected.has(node.index);

              return (
                <g
                  key={node.index}
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={node.name}
                  tabIndex={disabled ? -1 : 0}
                  className={cn("outline-none", !disabled && "cursor-pointer")}
                  onClick={() => toggle(node.index)}
                  onKeyDown={(event) => handleKeyDown(event, node.index)}
                >
                  <title>{node.name}</title>
                  {/* Larger transparent hit target for easier clicking/tapping. */}
                  <circle cx={node.x} cy={node.y} r={6} fill="transparent" />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={3.5}
                    className={cn(
                      "transition-colors",
                      isSelected
                        ? "fill-primary stroke-primary"
                        : "fill-background stroke-muted-foreground/50",
                    )}
                    strokeWidth={1.5}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </details>
    </section>
  );
}
