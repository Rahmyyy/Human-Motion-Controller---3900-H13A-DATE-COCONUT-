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
import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { Preset } from "../api/presetsApi";

type DeletePresetDialogProps = {
  error: string | null;
  isDeleting: boolean;
  onClearError: () => void;
  onDelete: (presetId: string) => Promise<boolean>;
  preset: Preset;
};

export default function DeletePresetDialog({
  error,
  isDeleting,
  onClearError,
  onDelete,
  preset,
}: DeletePresetDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (isDeleting) return;
    setIsOpen(open);
    if (open) onClearError();
  };

  const handleDelete = async () => {
    if (await onDelete(preset.id)) setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title={`Delete ${preset.name}`}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          <span className="sr-only">Delete {preset.name}</span>
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete preset?</DialogTitle>
          <DialogDescription>
            Delete “{preset.name}” and its {preset.mappingCount}{" "}
            {preset.mappingCount === 1 ? "mapping" : "mappings"}? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting…" : "Delete preset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
