import { Button } from "@/components/ui/button";
import { Play, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router";

type SelectedPreset = {
  id: string;
  mappingCount: number;
  name: string;
};

export default function PresetActionBar({
  patientName,
  patientId,
  selectedPreset,
}: {
  patientId: string | undefined;
  patientName: string;
  selectedPreset: SelectedPreset | undefined;
}) {
  const navigate = useNavigate();
  return (
    <footer className="fixed right-0 bottom-0 left-(--sidebar-width) border-t bg-background px-8 py-5 transition-[left] duration-150">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Selected for {patientName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <p className="font-semibold text-foreground">
              {selectedPreset ? selectedPreset.name : "No preset selected"}
            </p>
            {selectedPreset && (
              <span className="text-sm text-muted-foreground">
                {selectedPreset.mappingCount} mappings
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={!selectedPreset}
            onClick={() =>
              selectedPreset &&
              patientId &&
              navigate(`/patients/${patientId}/presets/${selectedPreset.id}/edit`)
            }
            className="min-w-40"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Edit Mappings
          </Button>

          <Button
            type="button"
            size="lg"
            disabled={!selectedPreset}
            onClick={() =>
              selectedPreset &&
              patientId &&
              navigate(`/patients/${patientId}/presets/${selectedPreset.id}/session`)
            }
            className="min-w-48"
          >
            <Play className="size-4" aria-hidden="true" />
            Start Session
          </Button>
        </div>
      </div>
    </footer>
  );
}
