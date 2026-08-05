import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CalendarDays, UserCheck, Users } from "lucide-react";

import ModifyPatientDialog from "@/features/patients/components/ModifyPatientDialog";
import RecentPatientsTable from "@/features/patients/components/RecentPatientsTable";
import { getPatients, type Patient } from "@/modules/patient-presets";
import {
  getDashboardOverview,
  getLocalDayRange,
  type DashboardOverview,
  type ScheduledSession,
} from "@/modules/scheduling";
import AddPatientDialog from "./components/AddPatientDialog";
import AddSessionDialog from "./components/AddSessionDialog";
import DashboardMetricCard from "./components/DashboardMetricCard";
import NeedsAttentionCard from "./components/NeedsAttentionCard";
import TodaysScheduleCard from "./components/TodaysScheduleCard";
import { countReadyPatients } from "./patientSummary";

const emptyOverview: DashboardOverview = {
  activePatientCount: 0,
  sessionsTodayCount: 0,
  todaysSchedule: [],
};

export default function MainDashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [overview, setOverview] = useState<DashboardOverview>(emptyOverview);
  const [isPatientsLoading, setIsPatientsLoading] = useState(true);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [patientBeingModified, setPatientBeingModified] = useState<Patient | null>(null);
  const navigate = useNavigate();

  const loadOverview = useCallback(async () => {
    try {
      setIsOverviewLoading(true);
      setOverviewError(null);
      setOverview(await getDashboardOverview(getLocalDayRange()));
    } catch (error) {
      console.error("Failed to load dashboard overview", error);
      setOverviewError("Failed to load dashboard summary.");
    } finally {
      setIsOverviewLoading(false);
    }
  }, []);

  const loadPatients = useCallback(async () => {
    try {
      setIsPatientsLoading(true);
      setPatientsError(null);
      setPatients(await getPatients());
    } catch (error) {
      console.error("Failed to load patients", error);
      setPatientsError("Failed to load patients.");
    } finally {
      setIsPatientsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialDashboard() {
      const [patientsResult, overviewResult] = await Promise.allSettled([
        getPatients(),
        getDashboardOverview(getLocalDayRange()),
      ]);
      if (!isMounted) return;

      if (patientsResult.status === "fulfilled") {
        setPatients(patientsResult.value);
      } else {
        console.error("Failed to load patients", patientsResult.reason);
        setPatientsError("Failed to load patients.");
      }
      setIsPatientsLoading(false);

      if (overviewResult.status === "fulfilled") {
        setOverview(overviewResult.value);
      } else {
        console.error("Failed to load dashboard overview", overviewResult.reason);
        setOverviewError("Failed to load dashboard summary.");
      }
      setIsOverviewLoading(false);
    }

    void loadInitialDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  function openPatient(patientId: string, patientName: string) {
    navigate(`/patients/${patientId}/presets`, { state: { patientName } });
  }

  function openScheduledPatient(session: ScheduledSession) {
    openPatient(session.patientId, session.patientDisplayName);
  }

  return (
    <section className="site-page-gutter min-h-screen bg-muted/20 py-8">
      <div className="w-full">
        <header className="flex flex-col items-start justify-between gap-6 sm:flex-row">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Welcome back, Dr. Smith
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Select a patient to view their available preset mappings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AddPatientDialog
              onPatientCreated={async () => {
                await Promise.all([loadPatients(), loadOverview()]);
              }}
            />
            <AddSessionDialog patients={patients} onSessionCreated={loadOverview} />
          </div>
        </header>

        <section
          className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Dashboard summary"
        >
          <DashboardMetricCard
            icon={Users}
            value={overview.activePatientCount}
            label="Active Patients"
            description="Patients under care"
          />
          <DashboardMetricCard
            icon={CalendarDays}
            value={overview.sessionsTodayCount}
            label="Sessions Today"
            description="Scheduled sessions"
          />
          <DashboardMetricCard
            icon={UserCheck}
            value={countReadyPatients(patients)}
            label="Patients Ready"
            description="Ready for a session"
          />
        </section>

        {overviewError && !isOverviewLoading && (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {overviewError}
          </p>
        )}

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
          <section className="min-w-0">
            {isPatientsLoading ? (
              <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground shadow-sm">
                Loading patients...
              </p>
            ) : patientsError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {patientsError}
              </p>
            ) : patients.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card/50 p-8 text-sm text-muted-foreground">
                No patients have been added yet. Add a patient to begin.
              </div>
            ) : (
              <RecentPatientsTable
                patients={patients}
                onModify={setPatientBeingModified}
                onSelect={(patient) => openPatient(patient.id, patient.displayName)}
              />
            )}
          </section>

          <aside className="space-y-6">
            <TodaysScheduleCard
              error={overviewError}
              isLoading={isOverviewLoading}
              sessions={overview.todaysSchedule}
              onSelectSession={openScheduledPatient}
            />
            <NeedsAttentionCard
              error={patientsError}
              isLoading={isPatientsLoading}
              patients={patients}
              onSelectPatient={(patient) => openPatient(patient.id, patient.displayName)}
            />
          </aside>
        </div>

        {patientBeingModified && (
          <ModifyPatientDialog
            key={patientBeingModified.id}
            patient={patientBeingModified}
            onClose={() => setPatientBeingModified(null)}
            onDeleted={(patientId) => {
              setPatients((currentPatients) =>
                currentPatients.filter((patient) => patient.id !== patientId),
              );
              setPatientBeingModified(null);
              void loadOverview();
            }}
            onUpdated={(updatedPatient) => {
              setPatients((currentPatients) =>
                currentPatients.map((patient) =>
                  patient.id === updatedPatient.id ? updatedPatient : patient,
                ),
              );
              setPatientBeingModified(null);
              void loadOverview();
            }}
          />
        )}
      </div>
    </section>
  );
}
