import { useState } from "react";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PatientFormFields from "@/features/patients/components/PatientFormFields";
import { createPatient, type PatientStatus } from "@/modules/patient-presets";

interface AddPatientDialogProps {
  onPatientCreated(): Promise<void>;
}

export default function AddPatientDialog({ onPatientCreated }: AddPatientDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [status, setStatus] = useState<PatientStatus>("active");

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <UserPlus className="size-4" aria-hidden="true" />
          Add Patient
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Patient</DialogTitle>
          <DialogDescription>Create a new patient profile for preset selection.</DialogDescription>
        </DialogHeader>

        <PatientFormFields
          idPrefix="add-patient"
          displayName={displayName}
          clinicalNotes={clinicalNotes}
          onDisplayNameChange={setDisplayName}
          onClinicalNotesChange={setClinicalNotes}
          status={status}
          onStatusChange={setStatus}
        />

        <DialogFooter>
          <Button
            type="button"
            onClick={async () => {
              const trimmedDisplayName = displayName.trim();
              if (!trimmedDisplayName) return;

              try {
                await createPatient(trimmedDisplayName, clinicalNotes.trim() || undefined, status);
                await onPatientCreated();
                setDisplayName("");
                setClinicalNotes("");
                setStatus("active");
                setIsOpen(false);
              } catch (error) {
                console.error("Failed to create patient", error);
              }
            }}
          >
            Create Patient
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
