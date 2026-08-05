export interface ScheduledSession {
  id: string;
  patientId: string;
  patientDisplayName: string;
  scheduledAtMs: number;
}

export interface DashboardOverview {
  activePatientCount: number;
  sessionsTodayCount: number;
  todaysSchedule: ScheduledSession[];
}

export interface LocalDayRange {
  dayStartMs: number;
  dayEndMs: number;
}
