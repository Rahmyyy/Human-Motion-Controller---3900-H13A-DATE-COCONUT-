import BackButton from "@/components/BackButton";
import { getMovementMapping } from "@/features/movement-mapping/api/movementMappingsApi";
import { useEffect, useState } from "react";
import { useParams } from "react-router";

interface MovementMappingDetailsResponse {
  id: string;
  preset_id: string;
  name: string;
  keybind: string;
  pose_frames_json: string;
}

export default function EditMovementMappingPage() {
  const { mappingId } = useParams();
  const [mapping, setMapping] = useState<MovementMappingDetailsResponse | null>(null);

  useEffect(() => {
    if (!mappingId) return;

    getMovementMapping(mappingId, "preset-1")
      .then(setMapping)
      .catch((error) => {
        console.error("Failed to load movement mapping", error);
      });
  }, [mappingId]);

  return (
    <main className="min-h-screen bg-background px-8 py-10">
      <div className="mx-auto grid max-w-4xl gap-6">
        <BackButton />

        <header>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Edit Mapping</h1>
          <p className="mt-3 text-base text-muted-foreground">Temporary details page.</p>
        </header>

        {mapping ? (
          <section className="grid gap-2 rounded-lg border bg-card p-5">
            <p>Name: {mapping.name}</p>
            <p>Keybind: {mapping.keybind}</p>
            <p>Pose JSON size: {mapping.pose_frames_json.length} chars</p>
          </section>
        ) : (
          <p className="text-muted-foreground">Loading mapping...</p>
        )}
      </div>
    </main>
  );
}
