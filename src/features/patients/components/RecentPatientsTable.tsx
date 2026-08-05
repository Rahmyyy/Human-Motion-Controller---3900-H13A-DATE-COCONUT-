import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Patient } from "@/modules/patient-presets";
import {
  filterPatients,
  type ActivityRange,
  type PatientStatusFilter,
} from "../patientTableFilters";
import PatientActionsMenu from "./PatientActionsMenu";

type RecentPatientsTableProps = {
  patients: Patient[];
  onModify: (patient: Patient) => void;
  onSelect: (patient: Patient) => void;
};

const activityFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function getInitials(displayName: string) {
  return displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function RecentPatientsTable({
  patients,
  onModify,
  onSelect,
}: RecentPatientsTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PatientStatusFilter>("all");
  const [activityRange, setActivityRange] = useState<ActivityRange>("allTime");
  const [filterNowMs] = useState(Date.now);
  const visiblePatients = useMemo(
    () => filterPatients(patients, { activityRange, nowMs: filterNowMs, search, status }),
    [activityRange, filterNowMs, patients, search, status],
  );

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-center xl:justify-between">
        <h2 className="text-lg font-semibold">Recent Patients</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Search patients"
              className="pl-9"
              placeholder="Search patients..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filter patients">
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as PatientStatusFilter)}
            >
              <SelectTrigger size="sm" aria-label="Patient status">
                <span>Status:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="needsReview">Needs Review</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={activityRange}
              onValueChange={(value) => setActivityRange(value as ActivityRange)}
            >
              <SelectTrigger size="sm" aria-label="Activity range">
                <span>Activity:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="allTime">All Time</SelectItem>
                <SelectItem value="sevenDays">Last 7 Days</SelectItem>
                <SelectItem value="thirtyDays">Last 30 Days</SelectItem>
                <SelectItem value="previousMonth">Previous Month</SelectItem>
                <SelectItem value="lastYear">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-4xl table-fixed text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="w-64 px-4 py-3 font-medium">Patient</th>
              <th className="w-64 px-4 py-3 font-medium">Condition</th>
              <th className="w-40 px-4 py-3 font-medium">Last Activity</th>
              <th className="w-24 px-4 py-3 font-medium">Presets</th>
              <th className="w-36 px-4 py-3 font-medium">Status</th>
              <th className="w-16 px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visiblePatients.map((patient) => (
              <tr
                key={patient.id}
                tabIndex={0}
                className="cursor-pointer border-b transition last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onSelect(patient)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onSelect(patient);
                }}
              >
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {getInitials(patient.displayName)}
                    </span>
                    <span className="truncate font-medium">{patient.displayName}</span>
                  </div>
                </td>
                <td className="truncate px-4 py-3 text-muted-foreground">
                  {patient.clinicalNotes || "Not specified"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {activityFormatter.format(patient.lastActivityAtMs)}
                </td>
                <td className="px-4 py-3">{patient.presetCount}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                      patient.status === "active"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                    )}
                  >
                    {patient.status === "active" ? "Active" : "Needs Review"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <PatientActionsMenu patient={patient} onModify={onModify} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visiblePatients.length === 0 && (
        <p className="border-t px-4 py-10 text-center text-sm text-muted-foreground">
          No patients match the current search and filter.
        </p>
      )}
    </div>
  );
}
