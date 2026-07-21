import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Copy } from "lucide-react";
import { useState } from "react";
import { duplicatePreset, type Preset } from "../api/presetsApi";
import { getDuplicatePresetName } from "../presetDisplay";

type DuplicatePresetDialogProps = {
  onDuplicated: (preset: Preset) => void;
  preset: Preset;
};

export default function DuplicatePresetDialog({
  onDuplicated,
  preset,
}: DuplicatePresetDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (isDuplicating) return;
    setIsOpen(open);
    if (open) setError(null);
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    setError(null);

    try {
      const duplicate = await duplicatePreset(preset.id);
      onDuplicated(duplicate);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to duplicate preset", error);
      setError("This preset could not be duplicated. Please try again.");
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" title={`Duplicate ${preset.name}`}>
          <Copy className="size-4" aria-hidden="true" />
          <span className="sr-only">Duplicate {preset.name}</span>
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate preset?</DialogTitle>
          <DialogDescription>
            Create “{getDuplicatePresetName(preset.name)}” with all {preset.mappingCount} mappings?
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleDuplicate} disabled={isDuplicating}>
            {isDuplicating ? "Duplicating…" : "Duplicate preset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
