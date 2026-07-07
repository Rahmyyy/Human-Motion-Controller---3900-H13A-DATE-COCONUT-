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
import type { PresetMappingCardData } from "../types";

interface PresetMappingCollectionProps {
  mappings: PresetMappingCardData[];
  onDelete: (id: string) => void;
}

export default function PresetMappingCollection({
  mappings,
  onDelete,
}: PresetMappingCollectionProps) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {mappings.map((mapping) => (
        <div key={mapping.id} className="relative">
          <Link to={`/preset/edit/${mapping.id}`}>
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
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete &quot;{mapping.name}&quot;?</DialogTitle>
                <DialogDescription>
                  This will permanently remove this movement mapping and its keybind. This cannot
                  be undone.
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
                    onClick={() => onDelete(mapping.id)}
                  >
                    Delete
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
