import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { Patient } from "@/modules/patient-presets";
import { patient } from "../testDashboard";
import AddSessionDialog from "./AddSessionDialog";

export const patients = [patient(), patient({ id: "patient-2", displayName: "Jo Lee" })];

export async function openDialog(withPatients: Patient[] = patients) {
  const onSessionCreated = vi.fn(() => Promise.resolve());
  render(<AddSessionDialog onSessionCreated={onSessionCreated} patients={withPatients} />);
  await userEvent.click(screen.getByRole("button", { name: "Add Session" }));
  return { onSessionCreated };
}

export async function choosePatient(name: string) {
  await userEvent.click(screen.getByRole("combobox", { name: "Patient" }));
  await userEvent.click(screen.getByRole("option", { name }));
}

/** The date trigger shows a formatted date; it is the only control here carrying digits. */
export const dateTrigger = () => screen.getByRole("button", { name: /\d{4}/ });

export const submit = () => screen.getByRole("button", { name: /Schedul/ });

export const dayCell = (date: Date) =>
  document.querySelector<HTMLButtonElement>(`[data-day="${date.toLocaleDateString(undefined)}"]`);
