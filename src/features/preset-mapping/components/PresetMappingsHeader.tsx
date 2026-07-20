import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Info, Plus } from "lucide-react";
import { Link } from "react-router";

type PresetMappingsHeaderProps = {
  presetId: string | undefined;
  presetName: string | null;
};

export default function PresetMappingsHeader({ presetId, presetName }: PresetMappingsHeaderProps) {
  return (
    <header>
      <BackButton />

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            {presetName ? `${presetName} Mappings` : "Mappings"}
          </h1>
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
    </header>
  );
}
