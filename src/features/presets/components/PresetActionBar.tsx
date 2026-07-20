import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

type SelectedPreset = {
  mappingCount: number;
  name: string;
};

export default function PresetActionBar({
  patientName,
  selectedPreset,
}: {
  patientName: string;
  selectedPreset: SelectedPreset | undefined;
}) {
  return (
    <footer className="fixed right-0 bottom-0 left-[var(--sidebar-width)] border-t bg-background px-8 py-5 transition-[left] duration-150">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Selected for {patientName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <p className="font-semibold text-foreground">
              {selectedPreset ? selectedPreset.name : "No preset selected"}
            </p>
            {selectedPreset && (
              <span className="text-sm text-muted-foreground">
                {selectedPreset.mappingCount} mappings
              </span>
            )}
          </div>
        </div>

        <Button
          type="button"
          size="lg"
          disabled={!selectedPreset}
          className="min-w-64 shadow-none transition-colors focus-visible:border-primary-foreground/70 focus-visible:ring-0 focus-visible:shadow-none focus-visible:outline-none"
        >
          <Play className="size-4" aria-hidden="true" />
          {selectedPreset ? `Start Session with ${selectedPreset.name}` : "Start Session"}
        </Button>
      </div>
    </footer>
  );
}
