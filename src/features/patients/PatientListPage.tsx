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
import { UserPlus } from "lucide-react";
import { createPatient, getPatients, type Patient } from "@/modules/patient-presets";
import PatientFormFields from "./components/PatientFormFields";
import ModifyPatientDialog from "./components/ModifyPatientDialog";
import RecentPatientsTable from "./components/RecentPatientsTable";

export default function PatientListPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientBeingModified, setPatientBeingModified] = useState<Patient | null>(null);

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
    let isMounted = true;

    async function loadInitialPatients() {
      try {
        setIsLoading(true);
        setError(null);

        const savedPatients = await getPatients();

        if (!isMounted) return;

        setPatients(savedPatients);
      } catch (error) {
        console.error("Failed to load patients", error);

        if (isMounted) {
          setError("Failed to load patients.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialPatients();

    return () => {
      isMounted = false;
    };
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
          <h2 className="text-lg font-semibold tracking-tight">Recent Patients</h2>
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
            <RecentPatientsTable
              patients={patients}
              onModify={setPatientBeingModified}
              onSelect={(patient) => {
                navigate(`/patients/${patient.id}/presets`, {
                  state: { patientName: patient.displayName },
                });
              }}
            />
          )}
        </section>
        <ModifyPatientDialog
          patient={patientBeingModified}
          onClose={() => setPatientBeingModified(null)}
          onDeleted={(patientId) => {
            setPatients((currentPatients) =>
              currentPatients.filter((patient) => patient.id !== patientId),
            );
            setPatientBeingModified(null);
          }}
          onUpdated={(updatedPatient) => {
            setPatients((currentPatients) =>
              currentPatients.map((patient) =>
                patient.id === updatedPatient.id ? updatedPatient : patient,
              ),
            );
            setPatientBeingModified(null);
          }}
        />
      </div>
    </section>
  );
}

function AddPatientDialog({ onPatientCreated }: { onPatientCreated: () => Promise<void> }) {
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
          <DialogDescription>Create a new patient profile for preset selection.</DialogDescription>
        </DialogHeader>
        <PatientFormFields
          idPrefix="add-patient"
          displayName={displayName}
          clinicalNotes={clinicalNotes}
          onDisplayNameChange={setDisplayName}
          onClinicalNotesChange={setClinicalNotes}
        />
        <DialogFooter>
          <Button
            type="button"
            onClick={async () => {
              const trimmedDisplayName = displayName.trim();

              if (!trimmedDisplayName) return;

              try {
                await createPatient(trimmedDisplayName, clinicalNotes.trim() || undefined);

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
