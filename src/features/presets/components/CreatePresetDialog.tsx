import { Button } from "@/components/ui/button";
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
import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

type PresetStartMode = "template" | "custom";

export default function CreatePresetDialog() {
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
