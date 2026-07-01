import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import { cn } from "@/lib/utils";
import { Info, Play } from "lucide-react";
import { useState } from "react";
import CreatePresetDialog from "./components/CreatePresetDialog";

type Preset = {
  id: string;
  name: string;
  description: string;
  mappingCount: number;
};

const patientName = "Lindsay Collins";

const mockPresets: Preset[] = [
  {
    id: "mario",
    name: "Mario",
    description: "Left, right, jump",
    mappingCount: 3,
  },
  {
    id: "space_invaders",
    name: "Space Invaders",
    description: "Left, right, shoot",
    mappingCount: 4,
  },
];

function PresetActionBar({ selectedPreset }: { selectedPreset: Preset | undefined }) {
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

export default function PresetSelectionPage() {
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const selectedPreset = mockPresets.find((preset) => preset.id === selectedPresetId);

  return (
    <section className="min-h-screen bg-background px-8 py-10 pb-32">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Choose or Create a Preset for {patientName}.
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Select a pre-existing mapping profile or create a new one to begin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <BackButton />
            <CreatePresetDialog />
          </div>
        </header>

        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight">Existing Presets</h2>

          <div className="mt-5 rounded-lg border border-dashed bg-card/50 p-8 text-sm text-muted-foreground">
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {mockPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={cn(
                    "rounded-lg border bg-card p-5 text-left shadow-sm transition hover:bg-muted/50",
                    selectedPresetId === preset.id && "border-primary ring-2 ring-primary/25",
                  )}
                >
                  <h3 className="text-lg font-semibold">{preset.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{preset.description}</p>
                  <p className="mt-4 text-sm font-medium text-muted-foreground">
                    {preset.mappingCount} mappings
                  </p>

                  {selectedPresetId === preset.id && (
                    <p className="mt-4 text-sm font-medium text-primary">Selected</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <PresetActionBar selectedPreset={selectedPreset} />
    </section>
  );
}
