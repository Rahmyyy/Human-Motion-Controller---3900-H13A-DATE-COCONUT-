import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus } from "lucide-react";

import {
  createPatient,
  getPatients,
  type Patient,
} from "./api/patientsApi";

export default function PatientListPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  async function loadPatients() {
    try {
      setIsLoading(true);
      setError(null);

      const savedPatients = await getPatients();
      setPatients(savedPatients);
    } catch (error) {
      console.error("Failed to load patients", error);
      setError("Failed to load patients.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

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
          <AddPatientDialog onPatientCreated={loadPatients} />
        </header>

        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight">
            Recent Patients

          </h2>
          {isLoading ? (
            <p className="mt-5 text-sm text-muted-foreground">Loading patients...</p>
          ) : error ? (
            <p className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : patients.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed bg-card/50 p-8 text-sm text-muted-foreground">
              No patients have been added yet. Add a patient to begin.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {patients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => {
                    navigate(`/patients/${patient.id}/presets`, {
                      state: { patientName: patient.displayName },
                    });
                  }}
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
          )}
        </section>
      </div>
    </section>
  );
}

function AddPatientDialog({
  onPatientCreated,
}: {
  onPatientCreated: () => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="display-name">Patient Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="e.g. Alex J."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinical-notes">Clinical Notes Optional</Label>
            <Textarea
              id="clinical-notes"
              value={clinicalNotes}
              onChange={(event) => setClinicalNotes(event.target.value)}
              placeholder="e.g. Stroke rehab, upper body focus"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
          type="button"
          onClick={async () => {
            const trimmedDisplayName = displayName.trim();

            if (!trimmedDisplayName) return;

            try {
              await createPatient(
                trimmedDisplayName,
                clinicalNotes.trim() || undefined,
              );

              await onPatientCreated();

              setDisplayName("");
              setClinicalNotes("");
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