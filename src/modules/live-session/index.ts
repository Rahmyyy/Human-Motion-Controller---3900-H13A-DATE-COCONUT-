import { browserSessionClock } from "./adapters/browserClock";
import { createSessionTracker } from "./sessionTracker";

export { createLiveSession } from "./liveSession";
export { createPresetRecognitionRuntime } from "./presetRecognition";
export { createSessionLauncher } from "./sessionLauncher";
export { createSummaryContextLoader } from "./summary";
export const sessionTracker = createSessionTracker(browserSessionClock);
export type {
  LiveSession,
  LiveSessionPhase,
  LiveSessionSnapshot,
  PresetRecognitionRuntime,
  PresetRecognitionSnapshot,
  RecognitionRuntimePhase,
  SessionLauncher,
  SessionLauncherSnapshot,
  SessionLauncherStatus,
  SessionSnapshot,
  SessionStatus,
  SessionSummary,
  SummaryContext,
  SummaryContextLoader,
  SummaryContextSnapshot,
} from "./types";
