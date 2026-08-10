import { useLocation, useParams } from "react-router";
import { DATE_RANGE_LABELS } from "@/modules/patient-history";
import CompletedSessionsTable from "./components/CompletedSessionsTable";
import PatientHistoryEmptyState from "./components/PatientHistoryEmptyState";
import PatientHistoryFilters from "./components/PatientHistoryFilters";
import PatientHistoryHeader from "./components/PatientHistoryHeader";
import PatientHistoryMetrics from "./components/PatientHistoryMetrics";
import PresetUsagePanel from "./components/PresetUsagePanel";
import SessionActivityPanel from "./components/SessionActivityPanel";
import ThresholdChangesPanel from "./components/ThresholdChangesPanel";
import { usePatientHistory } from "./hooks/usePatientHistory";

/**
 * A patient's completed sessions over time. The history service owns loading, filtering and
 * every derived series; this page places the panels and hands each one its slice.
 */
export default function PatientHistoryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const location = useLocation();
  const history = usePatientHistory(patientId);
  // Router state paints the name immediately; the loaded patient corrects it and survives a refresh.
  const patientName = history.patientName ?? location.state?.patientName ?? "selected patient";

  const showAllTime = () => history.setDateRange("all");
  const hasNoHistory = !history.isLoading && !history.error && history.totalSessionCount === 0;

  return (
    <section className="site-page-gutter min-h-screen bg-muted/20 py-8 pb-16">
      <div className="mx-auto max-w-7xl">
        <PatientHistoryHeader patientId={patientId} patientName={patientName} />

        {hasNoHistory ? (
          <PatientHistoryEmptyState patientId={patientId} patientName={patientName} />
        ) : (
          <>
            <div className="mt-6">
              <PatientHistoryFilters
                dateRange={history.filter.dateRange}
                disabled={history.isLoading || Boolean(history.error)}
                onDateRangeChange={history.setDateRange}
                onPresetChange={history.setPresetId}
                presetId={history.filter.presetId}
                presetOptions={history.presetOptions}
              />
            </div>

            <PatientHistoryMetrics
              isLoading={history.isLoading}
              rangeLabel={DATE_RANGE_LABELS[history.filter.dateRange]}
              summary={history.summary}
            />

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SessionActivityPanel
                  activity={history.activity}
                  error={history.error}
                  isLoading={history.isLoading}
                  onRetry={history.retry}
                  onShowAllTime={showAllTime}
                />
              </div>
              <PresetUsagePanel
                error={history.error}
                isLoading={history.isLoading}
                onRetry={history.retry}
                onShowAllTime={showAllTime}
                usage={history.presetUsage}
              />
            </div>

            <div className="mt-4">
              <ThresholdChangesPanel
                error={history.error}
                isLoading={history.isLoading}
                onRetry={history.retry}
                onShowAllTime={showAllTime}
                series={history.thresholds}
              />
            </div>

            <div className="mt-4">
              <CompletedSessionsTable
                error={history.error}
                isLoading={history.isLoading}
                onRetry={history.retry}
                onShowAllTime={showAllTime}
                sessions={history.sessions}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
