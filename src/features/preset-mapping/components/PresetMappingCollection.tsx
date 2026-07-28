import { Trash2 } from "lucide-react";
import { Link } from "react-router";
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
import PresetMappingCard from "./PresetMappingCard";
import type { PresetMappingViewData } from "../services/presetMappingsService.types";

interface PresetMappingCollectionProps {
  deletingMappingId: string | null;
  mappings: PresetMappingViewData[];
  onDelete: (id: string) => Promise<boolean>;
  patientId: string;
  presetId: string;
}

export default function PresetMappingCollection({
  deletingMappingId,
  mappings,
  onDelete,
  patientId,
  presetId,
}: PresetMappingCollectionProps) {
  if (mappings.length === 0) {
    return (
      <p className="mt-8 text-sm text-muted-foreground">
        No mappings saved yet. Click &quot;Add New Movement&quot; to create one.
      </p>
    );
  }

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {mappings.map((mapping) => (
        <div key={mapping.id} className="relative">
          <Link to={`/patients/${patientId}/presets/${presetId}/movements/${mapping.id}/edit`}>
            <PresetMappingCard mapping={mapping} />
          </Link>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-3 top-3"
                aria-label={`Delete ${mapping.name}`}
                disabled={deletingMappingId === mapping.id}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete &quot;{mapping.name}&quot;?</DialogTitle>
                <DialogDescription>
                  This will permanently remove this movement mapping and its keybind. This cannot be
                  undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void onDelete(mapping.id)}
                    disabled={deletingMappingId === mapping.id}
                  >
                    {deletingMappingId === mapping.id ? "Deleting…" : "Delete"}
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ))}
    </div>
  );
}
