import { beforeEach, describe, expect, it, vi } from "vitest";
import { invokeNative } from "@/contracts/native";
import { patient } from "../testCatalogue";
import {
  createPatient,
  deletePatient,
  exportPatient,
  getPatient,
  getPatients,
  importPatient,
  previewImportPatient,
  touchPatientActivity,
  updatePatient,
} from "./tauriCatalogue";

vi.mock("@/contracts/native", () => ({ invokeNative: vi.fn() }));

const invoke = vi.mocked(invokeNative);

beforeEach(() => {
  vi.clearAllMocks();
  invoke.mockResolvedValue(undefined as never);
});

describe("patients", () => {
  it("lists every patient", async () => {
    invoke.mockResolvedValue([patient()] as never);

    await expect(getPatients()).resolves.toEqual([patient()]);

    expect(invoke).toHaveBeenCalledWith("get_patients");
  });

  it("lists nothing before any patient exists", async () => {
    invoke.mockResolvedValue([] as never);

    await expect(getPatients()).resolves.toEqual([]);
  });

  it("reads one patient", async () => {
    invoke.mockResolvedValue(patient() as never);

    await expect(getPatient("patient-1")).resolves.toEqual(patient());

    expect(invoke).toHaveBeenCalledWith("get_patient", { id: "patient-1" });
  });

  it("creates a patient as active by default", async () => {
    invoke.mockResolvedValue(patient() as never);

    await createPatient("Alex Smith", "Prefers mornings");

    expect(invoke).toHaveBeenCalledWith("create_patient", {
      displayName: "Alex Smith",
      clinicalNotes: "Prefers mornings",
      status: "active",
    });
  });

  it("creates a patient needing review when asked to", async () => {
    invoke.mockResolvedValue(patient() as never);

    await createPatient("Alex Smith", undefined, "needsReview");

    expect(invoke).toHaveBeenCalledWith(
      "create_patient",
      expect.objectContaining({ clinicalNotes: null, status: "needsReview" }),
    );
  });

  /** Blank notes are stored as no notes, so the UI never shows an empty section. */
  it("stores blank notes as no notes", async () => {
    invoke.mockResolvedValue(patient() as never);

    await createPatient("Alex Smith", "");
    await updatePatient("patient-1", "Alex Smith", "", "active");

    expect(invoke).toHaveBeenNthCalledWith(
      1,
      "create_patient",
      expect.objectContaining({ clinicalNotes: null }),
    );
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      "update_patient",
      expect.objectContaining({ clinicalNotes: null }),
    );
  });

  it("updates a patient against their own id", async () => {
    invoke.mockResolvedValue(patient() as never);

    await updatePatient("patient-1", "Alex Smith", "Prefers mornings", "needsReview");

    expect(invoke).toHaveBeenCalledWith("update_patient", {
      id: "patient-1",
      displayName: "Alex Smith",
      clinicalNotes: "Prefers mornings",
      status: "needsReview",
    });
  });

  it("marks a patient as recently active", async () => {
    await touchPatientActivity("patient-1");

    expect(invoke).toHaveBeenCalledWith("touch_patient_activity", { patientId: "patient-1" });
  });

  it("deletes a patient", async () => {
    await deletePatient("patient-1");

    expect(invoke).toHaveBeenCalledWith("delete_patient", { id: "patient-1" });
  });
});

describe("moving a patient between machines", () => {
  it("exports a patient to a chosen file", async () => {
    await exportPatient("patient-1", "/tmp/alex.json");

    expect(invoke).toHaveBeenCalledWith("export_patient", {
      patientId: "patient-1",
      filePath: "/tmp/alex.json",
    });
  });

  it("previews the patient a file holds before importing it", async () => {
    invoke.mockResolvedValue("Alex Smith" as never);

    await expect(previewImportPatient("/tmp/alex.json")).resolves.toBe("Alex Smith");

    expect(invoke).toHaveBeenCalledWith("preview_import_patient", { filePath: "/tmp/alex.json" });
  });

  it("imports the patient a file holds", async () => {
    invoke.mockResolvedValue(patient() as never);

    await expect(importPatient("/tmp/alex.json")).resolves.toEqual(patient());
  });
});
