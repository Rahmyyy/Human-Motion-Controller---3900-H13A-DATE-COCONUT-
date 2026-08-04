import { Trash2 } from "lucide-react";
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
import type { MappingViewData, ThresholdSaveState } from "@/modules/movement-mapping";

interface PresetMappingCollectionProps {
  deletingMappingId: string | null;
  mappings: MappingViewData[];
  onDelete: (id: string) => Promise<boolean>;
  onThresholdChange: (id: string, percentage: number) => Promise<boolean>;
  patientId: string;
  presetId: string;
  thresholdSaveStates: Record<string, ThresholdSaveState>;
}

export default function PresetMappingCollection({
  deletingMappingId,
  mappings,
  onDelete,
  onThresholdChange,
  patientId,
  presetId,
  thresholdSaveStates,
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
          <PresetMappingCard
            editTo={`/patients/${patientId}/presets/${presetId}/movements/${mapping.id}/edit`}
            mapping={mapping}
            onThresholdChange={(percentage) => {
              void onThresholdChange(mapping.id, percentage);
            }}
            thresholdSaveState={thresholdSaveStates[mapping.id] ?? "idle"}
          />
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
