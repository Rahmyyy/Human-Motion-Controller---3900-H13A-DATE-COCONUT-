import { Button } from "@/components/ui/button";
import { Info, Play } from "lucide-react";

type SelectedPreset = {
  name: string;
};

export default function PresetActionBar({
  selectedPreset,
}: {
  selectedPreset: SelectedPreset | undefined;
}) {
  return (
    <footer className="fixed inset-x-0 bottom-0 border-t bg-background px-8 py-5">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
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

        <Button type="button" size="lg" disabled={!selectedPreset} className="min-w-56">
          <Play className="size-4" aria-hidden="true" />
          {selectedPreset ? "Start Session" : "Start Session"}
        </Button>
      </div>
    </footer>
  );
}
