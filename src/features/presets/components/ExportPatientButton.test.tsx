import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { save } from "@tauri-apps/plugin-dialog";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportPatient } from "@/modules/patient-presets";
import ExportPatientButton from "./ExportPatientButton";

// The native save dialog and the Tauri export command are both replaced by stand-ins.
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: vi.fn() }));
vi.mock("@/modules/patient-presets", () => ({ exportPatient: vi.fn() }));

const chooseFile = vi.mocked(save);
const runExport = vi.mocked(exportPatient);

function renderButton() {
  return render(<ExportPatientButton patientId="patient-1" patientName="Alex Smith" />);
}

const exportButton = () => screen.getByRole("button", { name: /Export/ });
const failureMessage = "This patient could not be exported. Please try again.";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  chooseFile.mockResolvedValue("/tmp/alex.json");
  runExport.mockResolvedValue(undefined as never);
});

describe("ExportPatientButton", () => {
  /** The patient's name makes the saved file recognisable without opening it. */
  it("offers to save a JSON file named after the patient", async () => {
    renderButton();

    await userEvent.click(exportButton());

    expect(chooseFile).toHaveBeenCalledWith({
      defaultPath: "Alex Smith.json",
      filters: [{ name: "Patient Profile", extensions: ["json"] }],
    });
  });

  it("exports the patient to the chosen file", async () => {
    renderButton();

    await userEvent.click(exportButton());

    expect(runExport).toHaveBeenCalledWith("patient-1", "/tmp/alex.json");
  });

  /** Dismissing the save dialog is a clean no-op, not a failure worth reporting. */
  it("does nothing when the save dialog is dismissed", async () => {
    chooseFile.mockResolvedValue(null);
    renderButton();

    await userEvent.click(exportButton());

    expect(runExport).not.toHaveBeenCalled();
    expect(screen.queryByText(failureMessage)).not.toBeInTheDocument();
  });

  it("does nothing before the patient is known", async () => {
    render(<ExportPatientButton patientId={undefined} patientName="Alex Smith" />);

    await userEvent.click(exportButton());

    expect(chooseFile).not.toHaveBeenCalled();
  });

  /** A second click mid-write would export the same patient twice. */
  it("locks itself while the export is running", async () => {
    let settle!: () => void;
    runExport.mockReturnValue(new Promise<void>((resolve) => (settle = resolve)));
    renderButton();

    await userEvent.click(exportButton());

    expect(screen.getByRole("button", { name: "Exporting…" })).toBeDisabled();
    settle();
  });

  it("reports a failed export", async () => {
    runExport.mockRejectedValue(new Error("disk full"));
    renderButton();

    await userEvent.click(exportButton());

    expect(await screen.findByText(failureMessage)).toBeInTheDocument();
  });

  /** A failure must leave the button usable so the clinician can pick another location. */
  it("re-enables the button after a failure", async () => {
    runExport.mockRejectedValue(new Error("disk full"));
    renderButton();

    await userEvent.click(exportButton());

    expect(exportButton()).toBeEnabled();
  });

  it("hides its icon from assistive technology", () => {
    const { container } = renderButton();

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
