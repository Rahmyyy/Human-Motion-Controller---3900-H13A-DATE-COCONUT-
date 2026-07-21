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
import { createPreset } from "../api/presetsApi";

export default function CreatePresetDialog({
  patientId,
}: {
  patientId: string;
}) {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<PresetStartMode | null>(null);
  const [presetName, setPresetName] = useState("");

  const trimmedPresetName = presetName.trim();
  const canContinue =
    selectedMode === "template" || (selectedMode === "custom" && trimmedPresetName.length > 0);

  const resetDialog = () => {
    setSelectedMode(null);
    setPresetName("");
  };

  const handleContinue = async () => {
    if (!canContinue) return;

    if (selectedMode === "custom") {
      try {
        const preset = await createPreset(patientId, trimmedPresetName);
        navigate(`/patients/${patientId}/presets/${preset.id}/edit`);
      } catch (error) {
        console.error("Failed to create preset", error);
      }

      return;
    }
    // later add to here, functionality for existing templates
  };

  return (
    <Dialog onOpenChange={(open) => !open && resetDialog()}>
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

        <PresetStartModeSelector selectedMode={selectedMode} onSelectMode={setSelectedMode} />

        {selectedMode === "custom" && (
          <PresetNameSection value={presetName} onChange={setPresetName} />
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleContinue} disabled={!canContinue}>
            {selectedMode === "custom" ? "Create Preset" : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
