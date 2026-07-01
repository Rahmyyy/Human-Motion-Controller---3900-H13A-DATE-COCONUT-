import BackButton from "@/components/BackButton";
import { useState } from "react";
import CameraModeToggle from "./components/CameraModeToggle";
import CreatePresetDialog from "./components/CreatePresetDialog";
import PresetActionBar from "./components/PresetActionBar";
import PresetCollection from "./components/PresetCollection";

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
            <CameraModeToggle />
            <BackButton />
            <CreatePresetDialog />
          </div>
        </header>

        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight">Existing Presets</h2>

          <PresetCollection
            presets={mockPresets}
            selectedPresetId={selectedPresetId}
            onSelectPreset={setSelectedPresetId}
          />
        </section>
      </div>

      <PresetActionBar selectedPreset={selectedPreset} />
    </section>
  );
}
