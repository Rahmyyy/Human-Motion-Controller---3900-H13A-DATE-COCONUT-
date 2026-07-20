import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Info, Plus, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router";

type PresetMappingsHeaderProps = {
  presetId: string | undefined;
  presetName: string | null;
};

export default function PresetMappingsHeader({ presetId, presetName }: PresetMappingsHeaderProps) {
  return (
    <header>
      <BackButton />

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-3 self-start rounded-lg border bg-card px-4 py-3">
          <SlidersHorizontal className="size-6 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm text-muted-foreground">Preset</p>
            <p className="font-semibold text-foreground">{presetName ?? "Loading…"}</p>
          </div>
        </div>

        <Button asChild={Boolean(presetId)} size="lg" disabled={!presetId}>
          {presetId ? (
            <Link to={`/presets/${presetId}/movements/new`}>
              <Plus className="size-4" aria-hidden="true" />
              Add New Movement
            </Link>
          ) : (
            <span>Add New Movement</span>
          )}
        </Button>
      </div>

      <div className="mt-8 flex items-center gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Edit mappings</h1>
        <div className="group relative">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-describedby="mapping-page-help"
            aria-label="About movement mappings"
          >
            <Info className="size-4" aria-hidden="true" />
          </Button>
          <div
            id="mapping-page-help"
            role="tooltip"
            className="invisible absolute top-full left-0 z-20 mt-2 w-64 rounded-md border bg-popover p-3 text-sm text-popover-foreground opacity-0 shadow-sm transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
          >
            Configure movement mappings and keybinds for this preset.
          </div>
        </div>
      </div>
    </header>
  );
}
