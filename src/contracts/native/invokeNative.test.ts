import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { NativeInvocationError } from "./error";
import { invokeNative } from "./invokeNative";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const nativeInvoke = vi.mocked(invoke);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("invokeNative", () => {
  it("calls the command with the arguments it was given", async () => {
    nativeInvoke.mockResolvedValue(undefined);

    await invokeNative("delete_patient", { id: "patient-1" });

    expect(nativeInvoke).toHaveBeenCalledWith("delete_patient", { id: "patient-1" });
  });

  it("calls a command that takes no arguments without any", async () => {
    nativeInvoke.mockResolvedValue([]);

    await invokeNative("get_patients");

    expect(nativeInvoke).toHaveBeenCalledWith("get_patients", undefined);
  });

  it("hands back what the command returned", async () => {
    nativeInvoke.mockResolvedValue("Alex Smith");

    await expect(invokeNative("preview_import_patient", { filePath: "/tmp/a.json" })).resolves.toBe(
      "Alex Smith",
    );
  });

  /** Every caller can rely on catching an Error, whatever shape the native side rejected with. */
  it("turns a typed native rejection into an error carrying its code", async () => {
    nativeInvoke.mockRejectedValue({ code: "PATIENT_NOT_FOUND", message: "No such patient." });

    await expect(invokeNative("get_patient", { id: "missing" })).rejects.toThrow(
      NativeInvocationError,
    );
  });

  it("turns a plain string rejection into an error", async () => {
    nativeInvoke.mockRejectedValue("database is locked");

    await expect(invokeNative("get_patients")).rejects.toThrow("database is locked");
  });

  it("passes an error rejection straight through", async () => {
    const error = new Error("offline");
    nativeInvoke.mockRejectedValue(error);

    await expect(invokeNative("get_patients")).rejects.toBe(error);
  });
});
