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
import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import PresetNameSection from "./PresetNameSection";
import PresetStartModeSelector, { type PresetStartMode } from "./PresetStartModeSelector";
import type { Preset } from "@/modules/patient-presets";

interface CreatePresetDialogProps {
  error: string | null;
  isCreating: boolean;
  onClearError: () => void;
  onCreate: (name: string) => Promise<Preset | null>;
  patientId: string | undefined;
}

export default function CreatePresetDialog({
  error,
  isCreating,
  onClearError,
  onCreate,
  patientId,
}: CreatePresetDialogProps) {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<PresetStartMode | null>(null);
  const [presetName, setPresetName] = useState("");

  const trimmedPresetName = presetName.trim();
  const canContinue = selectedMode === "custom" && trimmedPresetName.length > 0;

  const resetDialog = () => {
    setSelectedMode(null);
    setPresetName("");
  };

  const handleContinue = async () => {
    if (!canContinue) return;

    if (selectedMode === "custom") {
      const preset = await onCreate(trimmedPresetName);
      if (preset && patientId) {
        navigate(`/patients/${patientId}/presets/${preset.id}/edit`);
      }
    }
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) onClearError();
        else resetDialog();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="lg" className="shadow-sm">
          <Plus className="size-4" aria-hidden="true" />
          Add Preset
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Preset</DialogTitle>
          <DialogDescription>Choose how you want to start.</DialogDescription>
        </DialogHeader>

        <PresetStartModeSelector selectedMode={selectedMode} onSelectMode={setSelectedMode} />

        {selectedMode === "custom" && (
          <PresetNameSection value={presetName} onChange={setPresetName} />
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleContinue} disabled={!canContinue || isCreating}>
            {isCreating ? "Creating…" : selectedMode === "custom" ? "Create Preset" : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
