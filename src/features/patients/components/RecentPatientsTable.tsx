import type { Patient } from "@/modules/patient-presets";
import PatientActionsMenu from "./PatientActionsMenu";

type RecentPatientsTableProps = {
  patients: Patient[];
  onModify: (patient: Patient) => void;
  onSelect: (patient: Patient) => void;
};

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
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="w-2/5 px-4 py-3 font-medium">Patient</th>
            <th className="w-2/5 px-4 py-3 font-medium">Condition</th>
            <th className="w-24 px-4 py-3 font-medium">Presets</th>
            <th className="w-14 px-4 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {patients.map((patient) => (
            <tr
              key={patient.id}
              tabIndex={0}
              className="cursor-pointer border-b transition last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onSelect(patient)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSelect(patient);
                }
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

              <td className="px-4 py-3">{patient.presetCount}</td>

              <td className="px-4 py-3">
                <PatientActionsMenu patient={patient} onModify={onModify} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
