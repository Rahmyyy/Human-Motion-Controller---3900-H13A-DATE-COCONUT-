import { Button } from "@/components/ui/button";
import { Info, Play, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router";

type SelectedPreset = {
  id: string;
  name: string;
};

export default function PresetActionBar({
  selectedPreset,
}: {
  selectedPreset: SelectedPreset | undefined;
}) {
  const navigate = useNavigate();

  return (
    <footer className="fixed right-0 bottom-0 left-[var(--sidebar-width)] border-t bg-background px-8 py-5 transition-[left] duration-150">
      <div className="mx-auto flex max-w-6xl flex-col items-stretch gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Info className="size-4" aria-hidden="true" />
          </span>
          <span>
            {selectedPreset
              ? `Selected: ${selectedPreset.name}`
              : "Select or create a preset to begin."}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={!selectedPreset}
            onClick={() => selectedPreset && navigate(`/presets/${selectedPreset.id}/edit`)}
            className="min-w-40"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Edit Mappings
          </Button>

          <Button type="button" size="lg" disabled={!selectedPreset} className="min-w-48">
            <Play className="size-4" aria-hidden="true" />
            Start Session
          </Button>
        </div>
      </div>
    </footer>
  );
}
