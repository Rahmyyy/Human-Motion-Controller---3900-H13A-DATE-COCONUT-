import { Link } from "react-router";
import PresetMappingCard from "./PresetMappingCard";
import type { PresetMappingCardData } from "../types";

interface PresetMappingCollectionProps {
  mappings: PresetMappingCardData[];
}

export default function PresetMappingCollection({ mappings }: PresetMappingCollectionProps) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {mappings.map((mapping) => (
        <Link key={mapping.id} to={`/preset/edit/${mapping.id}`}>
          <PresetMappingCard mapping={mapping} />
        </Link>
      ))}
    </div>
  );
}
