import { CalendarDays, ChevronRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScheduledSession } from "@/modules/scheduling";

interface TodaysScheduleCardProps {
  error: string | null;
  isLoading: boolean;
  onSelectSession(session: ScheduledSession): void;
  sessions: ScheduledSession[];
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

export default function TodaysScheduleCard({
  error,
  isLoading,
  onSelectSession,
  sessions,
}: TodaysScheduleCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" aria-hidden="true" />
          Today&apos;s Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3">
        {isLoading ? (
          <p className="px-1 py-3 text-sm text-muted-foreground">Loading schedule...</p>
        ) : error ? (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        ) : sessions.length === 0 ? (
          <p className="px-1 py-3 text-sm text-muted-foreground">No sessions scheduled today.</p>
        ) : (
          <div className="divide-y">
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onSelectSession(session)}
                className="flex w-full items-center gap-3 rounded-md px-1 py-3 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
                  {timeFormatter.format(session.scheduledAtMs)}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {session.patientDisplayName}
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
