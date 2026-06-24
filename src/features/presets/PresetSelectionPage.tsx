import { Button } from "@/components/ui/button";
import { Info, Play, Plus } from "lucide-react";

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

export default function PresetSelectionPage() {
  return (
    <section className="min-h-screen bg-background px-8 py-10 pb-32">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Choose or Create a Preset for (patient's name).
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Select a pre-existing mapping profile or create a new one to begin.
            </p>
          </div>

          <Button type="button" size="lg" className="shadow-sm">
            <Plus className="size-4" aria-hidden="true" />
            Create New Preset
          </Button>
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
