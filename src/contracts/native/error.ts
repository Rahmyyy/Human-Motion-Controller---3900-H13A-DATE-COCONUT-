import type { NativeErrorDto } from "./dtos";

export class NativeInvocationError extends Error {
  readonly code: string;

  constructor(error: NativeErrorDto) {
    super(error.message);
    this.name = "NativeInvocationError";
    this.code = error.code;
  }
}

export function isNativeError(value: unknown): value is NativeErrorDto {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<NativeErrorDto>;
  return typeof candidate.code === "string" && typeof candidate.message === "string";
}

/** Convert both legacy string rejections and typed native errors into message-preserving Errors. */
export function normalizeNativeError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (isNativeError(value)) return new NativeInvocationError(value);
  if (typeof value === "string") return new Error(value);
  return new Error("Native operation failed");
}
