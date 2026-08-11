import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { open } from "@tauri-apps/plugin-dialog";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { importPatient, previewImportPatient } from "@/modules/patient-presets";
import { patient } from "../testPatients";
import ImportPatientButton from "./ImportPatientButton";

// The native file picker and the Tauri import command are both replaced by stand-ins.
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@/modules/patient-presets", () => ({
  importPatient: vi.fn(),
  previewImportPatient: vi.fn(),
}));

const pickFile = vi.mocked(open);
const preview = vi.mocked(previewImportPatient);
const runImport = vi.mocked(importPatient);

function Destination() {
  const location = useLocation();
  return (
    <p>
      arrived at {location.pathname} with {JSON.stringify(location.state)}
    </p>
  );
}

function renderButton(patients = [patient()]) {
  const onImported = vi.fn(() => Promise.resolve());
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="/"
          element={<ImportPatientButton patients={patients} onImported={onImported} />}
        />
        <Route path="/patients/:patientId/presets" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
  return { onImported };
}

const importButton = () => screen.getByRole("button", { name: /Import/ });
const failureMessage = "This file could not be imported. Please check it and try again.";

// Three re-entrancy guards in this component are not exercised below, because nothing in the UI
// can reach them: the button is disabled while an import runs, and the duplicate dialog can only
// ever be closed from inside itself and only renders while a duplicate is pending.

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  pickFile.mockResolvedValue("/tmp/jo.json");
  preview.mockResolvedValue("Jo Lee");
  runImport.mockResolvedValue(patient({ id: "patient-9", displayName: "Jo Lee" }));
});

describe("ImportPatientButton", () => {
  it("asks for a patient profile file", async () => {
    renderButton();

    await userEvent.click(importButton());

    expect(pickFile).toHaveBeenCalledWith({
      multiple: false,
      filters: [{ name: "Patient Profile", extensions: ["json"] }],
    });
  });

  it("imports the chosen file and opens the new patient", async () => {
    const { onImported } = renderButton();

    await userEvent.click(importButton());

    expect(runImport).toHaveBeenCalledWith("/tmp/jo.json");
    expect(onImported).toHaveBeenCalled();
    expect(
      await screen.findByText(
        'arrived at /patients/patient-9/presets with {"patientName":"Jo Lee"}',
      ),
    ).toBeInTheDocument();
  });

  /** Dismissing the file picker is a clean no-op, not a failure worth reporting. */
  it("does nothing when the file picker is dismissed", async () => {
    pickFile.mockResolvedValue(null);
    renderButton();

    await userEvent.click(importButton());

    expect(preview).not.toHaveBeenCalled();
    expect(screen.queryByText(failureMessage)).not.toBeInTheDocument();
  });

  describe("a file that cannot be read", () => {
    it("reports the failure without importing", async () => {
      preview.mockRejectedValue(new Error("not valid json"));
      renderButton();

      await userEvent.click(importButton());

      expect(await screen.findByText(failureMessage)).toBeInTheDocument();
      expect(runImport).not.toHaveBeenCalled();
    });

    it("re-enables the button so the clinician can try another file", async () => {
      preview.mockRejectedValue(new Error("not valid json"));
      renderButton();

      await userEvent.click(importButton());

      expect(importButton()).toBeEnabled();
    });
  });

  it("reports a failure from the import itself", async () => {
    runImport.mockRejectedValue(new Error("database locked"));
    renderButton();

    await userEvent.click(importButton());

    expect(await screen.findByText(failureMessage)).toBeInTheDocument();
  });

  // Two patients may legitimately share a name, so the import warns rather than blocking.
  describe("when a patient of the same name exists", () => {
    beforeEach(() => {
      preview.mockResolvedValue("Alex Smith");
    });

    it("warns that a separate patient will be created", async () => {
      renderButton();

      await userEvent.click(importButton());

      expect(
        await screen.findByRole("dialog", { name: "Patient already exists" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/already exists. Importing will create a separate new patient/),
      ).toBeInTheDocument();
      expect(runImport).not.toHaveBeenCalled();
    });

    it("imports anyway once confirmed", async () => {
      renderButton();

      await userEvent.click(importButton());
      await userEvent.click(await screen.findByRole("button", { name: "Import" }));

      expect(runImport).toHaveBeenCalledWith("/tmp/jo.json");
    });

    it("abandons the import when the clinician backs out", async () => {
      renderButton();

      await userEvent.click(importButton());
      await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));

      expect(runImport).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("abandons the import when the warning is dismissed", async () => {
      renderButton();

      await userEvent.click(importButton());
      await userEvent.keyboard("{Escape}");

      expect(runImport).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
