import { useState } from "react";
import { useNavigate } from "react-router";
import { open } from "@tauri-apps/plugin-dialog";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload } from "lucide-react";

import { importPatient, previewImportPatient, type Patient } from "@/modules/patient-presets";

interface ImportPatientButtonProps {
  compact?: boolean;
  patients: Patient[];
  onImported: () => Promise<void>;
}

export default function ImportPatientButton({
  compact = false,
  patients,
  onImported,
}: ImportPatientButtonProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState<{
    filePath: string;
    displayName: string;
  } | null>(null);
  const navigate = useNavigate();

  const runImport = async (filePath: string) => {
    setIsImporting(true);
    try {
      const imported = await importPatient(filePath);
      await onImported();
      navigate(`/patients/${imported.id}/presets`, {
        state: { patientName: imported.displayName },
      });
    } catch (error) {
      console.error("Failed to import patient", error);
      setError("This file could not be imported. Please check it and try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = async () => {
    if (isImporting) return;

    setError(null);

    const filePath = await open({
      multiple: false,
      filters: [{ name: "Patient Profile", extensions: ["json"] }],
    });

    // User cancelled the open dialog — clean no-op, not an error.
    if (!filePath) return;

    setIsImporting(true);
    let displayName: string;
    try {
      displayName = await previewImportPatient(filePath);
    } catch (error) {
      console.error("Failed to read import file", error);
      setError("This file could not be imported. Please check it and try again.");
      setIsImporting(false);
      return;
    }
    setIsImporting(false);

    const hasSameName = patients.some((patient) => patient.displayName === displayName);
    if (hasSameName) {
      setPendingDuplicate({ filePath, displayName });
      return;
    }

    await runImport(filePath);
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant={compact ? "ghost" : "outline"}
        size={compact ? "icon" : "default"}
        title={compact ? "Import Patient" : undefined}
        aria-label={compact ? "Import Patient" : undefined}
        onClick={handleImport}
        disabled={isImporting}
      >
        <Upload className="size-4" aria-hidden="true" />
        {!compact && (isImporting ? "Importing…" : "Import Patient")}
      </Button>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Dialog
        open={pendingDuplicate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDuplicate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Patient already exists</DialogTitle>
            <DialogDescription>
              A patient named “{pendingDuplicate?.displayName}” already exists. Importing will
              create a separate new patient with the same name, not merge with the existing one.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDuplicate(null)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!pendingDuplicate) return;
                const { filePath } = pendingDuplicate;
                setPendingDuplicate(null);
                await runImport(filePath);
              }}
              disabled={isImporting}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
