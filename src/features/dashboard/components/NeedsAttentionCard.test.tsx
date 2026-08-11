import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Patient } from "@/modules/patient-presets";
import NeedsAttentionCard from "./NeedsAttentionCard";

const patient = (overrides: Partial<Patient> = {}): Patient => ({
  id: "patient-1",
  displayName: "Alex Smith",
  clinicalNotes: null,
  createdAt: "0",
  lastActivityAtMs: new Date(2026, 7, 9).getTime(),
  presetCount: 1,
  status: "needsReview",
  ...overrides,
});

/** The card formats dates in the runtime locale, so the expectation is derived the same way. */
const dateOf = (lastActivityAtMs: number) =>
  new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(
    lastActivityAtMs,
  );

function renderCard(props: Partial<React.ComponentProps<typeof NeedsAttentionCard>> = {}) {
  const onSelectPatient = vi.fn();
  render(
    <NeedsAttentionCard
      error={null}
      isLoading={false}
      onSelectPatient={onSelectPatient}
      patients={[]}
      {...props}
    />,
  );
  return { onSelectPatient };
}

describe("NeedsAttentionCard", () => {
  it("titles itself", () => {
    renderCard();

    expect(screen.getByText("Needs Attention")).toBeInTheDocument();
  });

  it("lists a flagged patient with why and when", () => {
    const flagged = patient();
    renderCard({ patients: [flagged] });

    expect(screen.getByText("Alex Smith")).toBeInTheDocument();
    expect(screen.getByText("Patient needs review")).toBeInTheDocument();
    expect(screen.getByText(dateOf(flagged.lastActivityAtMs))).toBeInTheDocument();
  });

  /** The card filters the full patient list itself, so active patients must not appear. */
  it("leaves out patients who are not flagged for review", () => {
    renderCard({ patients: [patient({ id: "active", displayName: "Jo Lee", status: "active" })] });

    expect(screen.queryByText("Jo Lee")).not.toBeInTheDocument();
    expect(screen.getByText("No patients need attention.")).toBeInTheDocument();
  });

  it("reports the chosen patient to its handler", async () => {
    const flagged = patient();
    const { onSelectPatient } = renderCard({ patients: [flagged] });

    await userEvent.click(screen.getByRole("button"));

    expect(onSelectPatient).toHaveBeenCalledWith(flagged);
  });

  it("says so when no patient needs attention", () => {
    renderCard();

    expect(screen.getByText("No patients need attention.")).toBeInTheDocument();
  });

  it("shows a loading note while the patients are fetched", () => {
    renderCard({ isLoading: true });

    expect(screen.getByText("Loading patients...")).toBeInTheDocument();
    expect(screen.queryByText("No patients need attention.")).not.toBeInTheDocument();
  });

  it("shows the load failure in place of the list", () => {
    renderCard({ error: "Failed to load patients.", patients: [patient()] });

    expect(screen.getByText("Failed to load patients.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  /** A refresh in flight has not failed yet, so the loading note wins over the previous error. */
  it("prefers the loading note over an error while still loading", () => {
    renderCard({ isLoading: true, error: "Failed to load patients." });

    expect(screen.getByText("Loading patients...")).toBeInTheDocument();
    expect(screen.queryByText("Failed to load patients.")).not.toBeInTheDocument();
  });
});
