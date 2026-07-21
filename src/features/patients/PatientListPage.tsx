import { useState } from "react";
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
import { UserPlus } from "lucide-react";

type Patient = {
  id: string;
  displayName: string;
  clinicalNotes?: string;
};

const initialPatients: Patient[] = [
  {
    id: "patient-1",
    displayName: "Lindsay Collins",
    clinicalNotes: "Broken 3rd leg",
  },
  {
    id: "patient-2",
    displayName: "Leo Ng Maisnam",
    clinicalNotes: "Mums life",
  },
];


export default function PatientListPage() {
    const [patients] = useState<Patient[]>(initialPatients);
  return (
    <section className="min-h-screen bg-background px-8 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Welcome back, Dr. Smith
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Select a patient to view their available preset mappings.
            </p>
          </div>
          <AddPatientDialog />
        </header>

        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight">
            Recent Patients

          </h2>
            <div className="mt-4 space-y-4">
            {patients.map((patient) => (
                <button
                key={patient.id}
                type="button"
                className="w-full rounded-lg border bg-card p-5 text-left shadow-sm transition hover:bg-muted/50"
                >
                <h3 className="font-semibold">{patient.displayName}</h3>

                {patient.clinicalNotes && (
                    <p className="mt-2 text-sm text-muted-foreground">
                    {patient.clinicalNotes}
                    </p>
                )}
                </button>
            ))}
            </div>
        </section>
      </div>
    </section>
  );
}

function AddPatientDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" className="gap-2">
          <UserPlus className="size-4" aria-hidden="true" />
          Add Patient
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Patient</DialogTitle>
          <DialogDescription>
            Create a new patient profile for preset selection.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button">Create Patient</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}