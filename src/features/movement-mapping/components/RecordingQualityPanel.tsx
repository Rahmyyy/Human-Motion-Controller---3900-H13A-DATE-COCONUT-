import { AlertTriangle, CheckCircle2, CircleX } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TRACKED_LANDMARKS,
  type TrackedLandmark,
} from "@/features/movement-recognition/recognition/types";
import type { RecordingQuality } from "../recording/analyseRecordingQuality";

const JOINT_LABELS: Record<TrackedLandmark, string> = {
  11: "Left shoulder",
  12: "Right shoulder",
  13: "Left elbow",
  14: "Right elbow",
  15: "Left wrist",
  16: "Right wrist",
  23: "Left hip",
  24: "Right hip",
  25: "Left knee",
  26: "Right knee",
  27: "Left ankle",
  28: "Right ankle",
};

interface RecordingQualityPanelProps {
  quality: RecordingQuality;
}

/**
 * Shows the recording's matcher compatibility and an expandable breakdown of
 * how consistently each tracked joint appeared in the captured frames.
 */
export default function RecordingQualityPanel({ quality }: RecordingQualityPanelProps) {
  const presentation = qualityPresentation(quality);
  const Icon = presentation.icon;

  return (
    <section
      className={cn("rounded-lg border p-4", presentation.className)}
      aria-label="Recording quality"
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Recording quality: {presentation.label}</h2>
          <p className="mt-1 text-sm">{presentation.message}</p>
          <p className="mt-2 text-xs opacity-80">
            {quality.usableFrames} of {quality.totalFrames} frames usable (
            {formatPercentage(quality.usableFramePercentage)})
          </p>
        </div>
      </div>

      <details className="mt-3 border-t border-current/15 pt-3">
        <summary className="cursor-pointer text-sm font-medium">Joint visibility details</summary>
        <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-xs">
          {TRACKED_LANDMARKS.map((index) => (
            <div key={index} className="contents">
              <dt>{JOINT_LABELS[index]}</dt>
              <dd className="text-right font-medium">
                {formatPercentage(quality.jointVisibility[index])}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}

/** Maps the calculated quality state to clinician-facing copy and styling. */
function qualityPresentation(quality: RecordingQuality) {
  if (quality.status === "good") {
    return {
      label: "Good",
      message: "The current matcher has enough consistently visible pose data.",
      className: "border-emerald-600/30 bg-emerald-50 text-emerald-900",
      icon: CheckCircle2,
    };
  }

  if (quality.status === "warning") {
    return {
      label: "Needs attention",
      message:
        "There is enough data to save, but recognition may be inconsistent. Consider repositioning and recording again.",
      className: "border-amber-600/30 bg-amber-50 text-amber-950",
      icon: AlertTriangle,
    };
  }

  if (quality.issues.includes("no_pose_frames")) {
    return {
      label: "Unusable",
      message:
        "No pose data was captured. Make sure Frontend camera mode is selected and a person is visible, then record again.",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
      icon: CircleX,
    };
  }

  return {
    label: "Unusable",
    message:
      "Not enough body points were captured reliably. Reposition the camera and record again before saving.",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: CircleX,
  };
}

/** Converts a zero-to-one ratio into the rounded percentage shown in the UI. */
function formatPercentage(value: number) {
  return `${Math.round(value * 100)}%`;
}
