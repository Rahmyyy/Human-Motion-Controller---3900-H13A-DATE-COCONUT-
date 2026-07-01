import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import { getMovementMappings } from "@/features/movement-mapping/api/movementMappingsApi";
import { Play, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import PresetMappingCollection from "./components/PresetMappingCollection";
import type { PresetMappingCardData } from "./types";

export default function PresetMappingsPage() {
  const [mappings, setMappings] = useState<PresetMappingCardData[]>([]);

  useEffect(() => {
    let isMounted = true;

    getMovementMappings("preset-1")
      .then((savedMappings) => {
        if (isMounted) {
          setMappings(savedMappings);
        }
      })
      .catch((error) => {
        console.error("Failed to load movement mappings", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

          <div className="flex items-center gap-3">
            <BackButton />
            <Button asChild size="lg" variant="outline">
              <Link to="/recognition">
                <Play className="size-4" aria-hidden="true" />
                Test Recognition
              </Link>
            </Button>
            <Button asChild size="lg">
              <Link to="/session">
                <Plus className="size-4" aria-hidden="true" />
                Add New Movement
              </Link>
            </Button>
          </div>
        </header>

        <PresetMappingCollection mappings={mappings} />
      </div>
    </section>
  );
}
