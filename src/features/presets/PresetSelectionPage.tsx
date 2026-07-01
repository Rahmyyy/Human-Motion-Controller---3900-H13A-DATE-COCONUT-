import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Info, Play, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

type PresetStartMode = "template" | "custom";

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

function PresetActionBar() {
  return (
    <footer className="fixed inset-x-0 bottom-0 border-t bg-background px-8 py-5">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Info className="size-4" aria-hidden="true" />
          </span>
          <span>Select or create a preset to begin.</span>
        </div>

        <Button type="button" size="lg" disabled className="min-w-56">
          <Play className="size-4" aria-hidden="true" />
          Start Session
        </Button>
      </div>
    </footer>
  );
}

function CreatePresetDialog() {
  const [selectedMode, setSelectedMode] = useState<PresetStartMode | null>(null);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="lg" className="shadow-sm">
          <Plus className="size-4" aria-hidden="true" />
          Create New Preset
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Preset</DialogTitle>
          <DialogDescription>Choose how you want to start.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            aria-pressed={selectedMode === "template"}
            onClick={() => setSelectedMode("template")}
            className={cn(
              "rounded-lg border p-4 text-left hover:bg-muted/50",
              selectedMode === "template" && "border-primary bg-primary/5 ring-1 ring-primary",
            )}
          >
            <div className="font-medium">Use Existing Template</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Start from a predefined movement mapping.
            </p>
          </button>

          <button
            type="button"
            aria-pressed={selectedMode === "custom"}
            onClick={() => setSelectedMode("custom")}
            className={cn(
              "rounded-lg border p-4 text-left hover:bg-muted/50",
              selectedMode === "custom" && "border-primary bg-primary/5 ring-1 ring-primary",
            )}
          >
            <div className="font-medium">Create Custom Preset</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Start from scratch with a blank configuration.
            </p>
          </button>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button asChild>
            <Link to="/preset/edit">Continue</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PresetSelectionPage() {
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
            {/* {put preset cards here} */}
            Later we will put the patient cards here ...
          </div>
        </section>
      </div>

      <PresetActionBar />
    </section>
  );
}
