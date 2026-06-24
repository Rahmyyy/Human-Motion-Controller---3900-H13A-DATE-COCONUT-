import { Button } from "@/components/ui/button";

export default function PresetSelectionPage() {
  return (
    <section className="min-h-screen bg-background p-8">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Choose a Preset for (user will go here).
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a pre-configured mapping profile to begin the rehabilitation session.
          </p>
        </div>

        <Button type="button">Add preset</Button>
      </header>
    </section>
  );
}
