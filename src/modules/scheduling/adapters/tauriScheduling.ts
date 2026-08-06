import { invokeNative, type ScheduledSessionDto } from "@/contracts/native";
import type { DashboardOverview, LocalDayRange, ScheduledSession } from "../types";

const toScheduledSession = (dto: ScheduledSessionDto): ScheduledSession => ({
  id: dto.id,
  patientId: dto.patientId,
  patientDisplayName: dto.patientDisplayName,
  scheduledAtMs: dto.scheduledAtMs,
});

export async function getDashboardOverview({
  dayStartMs,
  dayEndMs,
}: LocalDayRange): Promise<DashboardOverview> {
  const overview = await invokeNative("get_dashboard_overview", { dayStartMs, dayEndMs });
  return {
    activePatientCount: overview.activePatientCount,
    sessionsTodayCount: overview.sessionsTodayCount,
    todaysSchedule: overview.todaysSchedule.map(toScheduledSession),
  };
}

export async function createScheduledSession(patientId: string, scheduledAtMs: number) {
  return toScheduledSession(
    await invokeNative("create_scheduled_session", { patientId, scheduledAtMs }),
  );
}
