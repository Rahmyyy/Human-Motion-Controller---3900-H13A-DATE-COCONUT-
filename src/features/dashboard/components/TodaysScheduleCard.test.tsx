import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ScheduledSession } from "@/modules/scheduling";
import TodaysScheduleCard from "./TodaysScheduleCard";

const session = (overrides: Partial<ScheduledSession> = {}): ScheduledSession => ({
  id: "session-1",
  patientId: "patient-1",
  patientDisplayName: "Alex Smith",
  scheduledAtMs: new Date(2026, 7, 9, 9, 30).getTime(),
  ...overrides,
});

/** The card formats times in the runtime locale, so the expectation is derived the same way. */
const timeOf = (scheduledAtMs: number) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(scheduledAtMs);

function renderCard(props: Partial<React.ComponentProps<typeof TodaysScheduleCard>> = {}) {
  const onSelectSession = vi.fn();
  render(
    <TodaysScheduleCard
      error={null}
      isLoading={false}
      onSelectSession={onSelectSession}
      sessions={[]}
      {...props}
    />,
  );
  return { onSelectSession };
}

describe("TodaysScheduleCard", () => {
  it("titles itself", () => {
    renderCard();

    expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
  });

  it("lists each session by time and patient", () => {
    const later = session({
      id: "session-2",
      patientDisplayName: "Jo Lee",
      scheduledAtMs: new Date(2026, 7, 9, 14, 5).getTime(),
    });
    renderCard({ sessions: [session(), later] });

    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByText("Alex Smith")).toBeInTheDocument();
    expect(screen.getByText(timeOf(later.scheduledAtMs))).toBeInTheDocument();
  });

  it("reports the chosen session to its handler", async () => {
    const chosen = session();
    const { onSelectSession } = renderCard({ sessions: [chosen] });

    await userEvent.click(screen.getByRole("button"));

    expect(onSelectSession).toHaveBeenCalledWith(chosen);
  });

  it("says so when nothing is scheduled today", () => {
    renderCard();

    expect(screen.getByText("No sessions scheduled today.")).toBeInTheDocument();
  });

  it("shows a loading note while the overview is fetched", () => {
    renderCard({ isLoading: true });

    expect(screen.getByText("Loading schedule...")).toBeInTheDocument();
    expect(screen.queryByText("No sessions scheduled today.")).not.toBeInTheDocument();
  });

  it("shows the load failure in place of the list", () => {
    renderCard({ error: "Failed to load dashboard summary.", sessions: [session()] });

    expect(screen.getByText("Failed to load dashboard summary.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  /** A refresh in flight has not failed yet, so the loading note wins over the previous error. */
  it("prefers the loading note over an error while still loading", () => {
    renderCard({ isLoading: true, error: "Failed to load dashboard summary." });

    expect(screen.getByText("Loading schedule...")).toBeInTheDocument();
    expect(screen.queryByText("Failed to load dashboard summary.")).not.toBeInTheDocument();
  });
});
