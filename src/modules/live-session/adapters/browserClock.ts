import type { RecognitionClock } from "@/modules/recognition";
import type { SessionClock } from "../types";

export const browserRecognitionClock: RecognitionClock = {
  now: () => performance.now(),
  setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
  clearTimeout: (handle) => window.clearTimeout(handle as number),
};

export const browserSessionClock: SessionClock = {
  now: () => Date.now(),
  setInterval: (callback, delayMs) => window.setInterval(callback, delayMs),
  clearInterval: (handle) => window.clearInterval(handle as number),
};
