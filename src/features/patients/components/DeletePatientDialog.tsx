import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deletePatient, type Patient } from "@/modules/patient-presets";

type DeletePatientDialogProps = {
  onDeleted: (patientId: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  patient: Patient;
};

export default function DeletePatientDialog({
  onDeleted,
  onOpenChange,
  open,
  patient,
}: DeletePatientDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    try {
      setIsDeleting(true);
      setError(null);
      await deletePatient(patient.id);
      onDeleted(patient.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to delete patient.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isDeleting) onOpenChange(nextOpen);
        if (nextOpen) setError(null);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Patient?</DialogTitle>
          <DialogDescription>
            Delete “{patient.displayName}” and all of their presets and movement mappings? This
            cannot be undone.
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
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
            {isDeleting ? "Deleting..." : "Delete Patient"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
