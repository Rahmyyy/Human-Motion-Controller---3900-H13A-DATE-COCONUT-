import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updatePatient, type Patient } from "@/modules/patient-presets";
import PatientFormFields from "./PatientFormFields";
import DeletePatientDialog from "./DeletePatientDialog";

type ModifyPatientDialogProps = {
  onClose: () => void;
  onDeleted: (patientId: string) => void;
  onUpdated: (patient: Patient) => void;
  patient: Patient | null;
};

export default function ModifyPatientDialog({
  onClose,
  onDeleted,
  onUpdated,
  patient,
}: ModifyPatientDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    if (!patient) return;
    setDisplayName(patient.displayName);
    setClinicalNotes(patient.clinicalNotes ?? "");
    setError(null);
  }, [patient]);

  async function handleSave() {
    if (!patient || !displayName.trim()) return;

    try {
      setIsSaving(true);
      setError(null);

      const updatedPatient = await updatePatient(
        patient.id,
        displayName.trim(),
        clinicalNotes.trim() || undefined,
      );

      onUpdated(updatedPatient);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to update patient.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={patient !== null}
      onOpenChange={(open) => {
        if (!open && !isSaving) onClose();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Modify Patient</DialogTitle>
        </DialogHeader>

        <PatientFormFields
          idPrefix="modify-patient"
          displayName={displayName}
          clinicalNotes={clinicalNotes}
          onDisplayNameChange={setDisplayName}
          onClinicalNotesChange={setClinicalNotes}
        />

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            disabled={isSaving}
            onClick={() => setIsDeleteOpen(true)}
          >
            Delete patient
          </Button>

          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={isSaving} onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={isSaving || !displayName.trim()} onClick={handleSave}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
        {patient && (
          <DeletePatientDialog
            open={isDeleteOpen}
            patient={patient}
            onOpenChange={setIsDeleteOpen}
            onDeleted={(patientId) => {
              setIsDeleteOpen(false);
              onDeleted(patientId);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
