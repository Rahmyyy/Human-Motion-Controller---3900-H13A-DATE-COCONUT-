import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router";

export default function CustomPresetPage() {
  const navigate = useNavigate();

  function handleAddNewMovement() {
    navigate("/session");
  }

  return (
    <section className="min-h-screen bg-background px-8 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Edit (name of mapping) Mappings
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Configure and monitor keybindings for patient physical therapy movements.
            </p>
          </div>

          <Button type="button" size="lg" className="shadow-sm" onClick={handleAddNewMovement}>
            <Plus className="size-4" aria-hidden="true" />
            Add New Movement
          </Button>
        </header>
      </div>
    </section>
  );
}
