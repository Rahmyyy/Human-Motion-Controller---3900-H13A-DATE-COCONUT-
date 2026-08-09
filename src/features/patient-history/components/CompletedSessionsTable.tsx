import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatSessionDuration,
  formatSessionTimestamp,
  type PatientSession,
} from "@/modules/patient-history";
import HistoryPanel from "./HistoryPanel";

interface CompletedSessionsTableProps {
  error: string | null;
  isLoading: boolean;
  onRetry: () => void;
  onShowAllTime: () => void;
  sessions: PatientSession[];
}

export default function CompletedSessionsTable({
  error,
  isLoading,
  onRetry,
  onShowAllTime,
  sessions,
}: CompletedSessionsTableProps) {
  return (
    <HistoryPanel
      title="Completed sessions"
      skeletonClassName="h-[180px]"
      error={error}
      isEmpty={sessions.length === 0}
      isLoading={isLoading}
      onRetry={onRetry}
      onShowAllTime={onShowAllTime}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Preset</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Triggers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="whitespace-nowrap">
                  {formatSessionTimestamp(session.startedAtMs)}
                </TableCell>
                <TableCell>{session.presetName}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {formatSessionDuration(session.durationMs)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{session.triggerCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </HistoryPanel>
  );
}
