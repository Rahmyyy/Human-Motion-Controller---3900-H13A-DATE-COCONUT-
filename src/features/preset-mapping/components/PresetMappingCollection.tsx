import { Trash2 } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
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
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-3 top-3"
            aria-label={`Delete ${mapping.name}`}
            onClick={() => onDelete(mapping.id)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ))}
    </div>
  );
}
