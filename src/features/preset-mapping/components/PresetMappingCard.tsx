import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  frameAtMovementThreshold,
  framesAtMovementThreshold,
  movementThresholdSettings,
} from "@/features/movement-mapping/threshold/movementThreshold";
import type { PresetMappingViewData } from "../services/presetMappingsService.types";
import type { ThresholdSaveState } from "../services/presetMappingsService.types";
import MappingPosePreview from "./MappingPosePreview";
import MovementThresholdControl from "./MovementThresholdControl";

interface PresetMappingCardProps {
  editTo: string;
  mapping: PresetMappingViewData;
  onThresholdChange: (percentage: number) => void;
  thresholdSaveState: ThresholdSaveState;
}

interface KeybindBadgeProps {
  keybind: string;
}

function KeybindBadge({ keybind }: KeybindBadgeProps) {
  return (
    <div className="inline-flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 shadow-xs">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Keybind
      </span>
      <kbd className="rounded-md bg-slate-700 px-3 py-1.5 font-mono text-sm font-semibold leading-none text-white shadow-sm">
        {keybind}
      </kbd>
    </div>
  );
}

export default function PresetMappingCard({
  editTo,
  mapping,
  onThresholdChange,
  thresholdSaveState,
}: PresetMappingCardProps) {
  const threshold = useMemo(
    () =>
      movementThresholdSettings(
        mapping.poseFrames,
        mapping.selectedLandmarks,
        mapping.thresholdPercentage,
      ),
    [mapping.poseFrames, mapping.selectedLandmarks, mapping.thresholdPercentage],
  );
  const [draftPercentage, setDraftPercentage] = useState<number | null>(null);
  const displayedPercentage =
    draftPercentage ?? threshold?.effectivePercentage ?? mapping.thresholdPercentage;
  const isAdjusting = draftPercentage !== null;

  const previewFrame = isAdjusting
    ? frameAtMovementThreshold(mapping.poseFrames, displayedPercentage)
    : null;
  const replayFrames = threshold
    ? framesAtMovementThreshold(mapping.poseFrames, displayedPercentage)
    : mapping.poseFrames;

  return (
    <Card className="gap-0 py-0 transition-colors hover:bg-muted/30">
      <Link to={editTo} aria-label={`Edit ${mapping.name}`}>
        <MappingPosePreview frames={replayFrames} previewFrame={previewFrame} />
        <CardHeader className="pt-4 pb-1">
          <CardTitle className="text-xl font-semibold leading-tight text-foreground">
            {mapping.name}
          </CardTitle>
        </CardHeader>
      </Link>
      <CardContent className="pt-1 pb-5">
        <KeybindBadge keybind={mapping.keybind} />
        {threshold && (
          <MovementThresholdControl
            minimum={threshold.minimumPercentage}
            movementName={mapping.name}
            onValueChange={setDraftPercentage}
            onValueCommit={(percentage) => {
              setDraftPercentage(null);
              if (percentage !== mapping.thresholdPercentage) {
                onThresholdChange(percentage);
              }
            }}
            saveState={thresholdSaveState}
            value={displayedPercentage}
          />
        )}
      </CardContent>
    </Card>
  );
}
