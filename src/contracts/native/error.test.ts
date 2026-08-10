import { describe, expect, it } from "vitest";
import { NativeInvocationError, isNativeError, normalizeNativeError } from "./error";

const nativeError = { code: "PATIENT_NOT_FOUND", message: "That patient no longer exists." };

describe("isNativeError", () => {
  it("recognises a typed error from the native side", () => {
    expect(isNativeError(nativeError)).toBe(true);
  });

  it("does not mistake anything else for one", () => {
    expect(isNativeError(null)).toBe(false);
    expect(isNativeError("PATIENT_NOT_FOUND")).toBe(false);
    expect(isNativeError({ code: "PATIENT_NOT_FOUND" })).toBe(false);
    expect(isNativeError({ message: "That patient no longer exists." })).toBe(false);
    expect(isNativeError({ code: 404, message: "gone" })).toBe(false);
  });
});

describe("NativeInvocationError", () => {
  it("keeps the code and message the native side sent", () => {
    const error = new NativeInvocationError(nativeError);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("NativeInvocationError");
    expect(error.code).toBe("PATIENT_NOT_FOUND");
    expect(error.message).toBe("That patient no longer exists.");
  });
});

describe("normalizeNativeError", () => {
  it("passes an error straight through", () => {
    const error = new Error("offline");

    expect(normalizeNativeError(error)).toBe(error);
  });

  it("turns a typed native error into one carrying its code", () => {
    const error = normalizeNativeError(nativeError);

    expect(error).toBeInstanceOf(NativeInvocationError);
    expect(error.message).toBe("That patient no longer exists.");
  });

  /** Older commands reject with a bare string; the message must survive either way. */
  it("keeps the message of a plain string rejection", () => {
    expect(normalizeNativeError("database is locked").message).toBe("database is locked");
  });

  it("describes a rejection that says nothing useful", () => {
    expect(normalizeNativeError(undefined).message).toBe("Native operation failed");
    expect(normalizeNativeError({ status: 500 }).message).toBe("Native operation failed");
  });
});
