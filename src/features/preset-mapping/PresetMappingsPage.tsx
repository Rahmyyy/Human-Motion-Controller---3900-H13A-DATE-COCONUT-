import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import {
  deleteMovementMapping,
  getMovementMappings,
} from "@/features/movement-mapping/api/movementMappingsApi";
import { Plus } from "lucide-react";
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

  function handleDelete(id: string) {
    deleteMovementMapping(id, "preset-1")
      .then(() => {
        setMappings((current) => current.filter((mapping) => mapping.id !== id));
      })
      .catch((error) => {
        console.error("Failed to delete movement mapping", error);
      });
  }

  return (
    <section className="min-h-screen bg-background px-8 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Edit {/* name of preset goes here */} Mappings
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Configure movement mappings for this preset.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <BackButton />
            <Button asChild size="lg">
              <Link to="/session">
                <Plus className="size-4" aria-hidden="true" />
                Add New Movement
              </Link>
            </Button>
          </div>
        </header>

        <PresetMappingCollection mappings={mappings} onDelete={handleDelete} />
      </div>

      <div className="fixed inset-x-0 bottom-8 px-8">
        <div className="mx-auto flex max-w-6xl justify-end">
          <Button asChild size="lg">
            <Link to="/recognition">Test Recognition</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
