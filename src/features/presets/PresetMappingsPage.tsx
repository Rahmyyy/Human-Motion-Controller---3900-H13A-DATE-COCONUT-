import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "react-router";

export default function PresetMappingsPage() {
  return (
    <section className="min-h-screen bg-background px-8 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Edit (name of preset) Mappings
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Configure movement mappings for this preset.
            </p>
          </div>

          <Button asChild size="lg">
            <Link to="/session">
              <Plus className="size-4" aria-hidden="true" />
              Add New Movement
            </Link>
          </Button>
        </header>
      </div>
    </section>
  );
}
