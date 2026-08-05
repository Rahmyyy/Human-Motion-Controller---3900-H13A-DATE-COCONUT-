import { emitTo, listen } from "@tauri-apps/api/event";
import { invokeNative } from "@/contracts/native";
import type { PressType } from "@/modules/movement-mapping";
import type {
  CompletedSession,
  EndSessionRequestedEvent,
  SessionEndedEvent,
  SessionSummary,
} from "../types";

export const openOverlay = (patientId: string, presetId: string, sessionId: string) =>
  invokeNative("open_overlay", { patientId, presetId, sessionId });

export const closeOverlay = (sessionId: string, summary: SessionSummary) =>
  invokeNative("close_overlay", { sessionId, summary });

export const recordCompletedSession = (session: CompletedSession) =>
  invokeNative("record_completed_session", { session });

export const onSessionEnded = (listener: (event: SessionEndedEvent) => void) =>
  listen<SessionEndedEvent>("session-ended", (event) => listener(event.payload));

export const onEndSessionRequested = (listener: (event: EndSessionRequestedEvent) => void) =>
  listen<EndSessionRequestedEvent>("end-session-requested", (event) => listener(event.payload));

export const requestOverlayEnd = (sessionId: string) =>
  emitTo("overlay", "end-session-requested", { sessionId } satisfies EndSessionRequestedEvent);

export const executeAction = (keybind: string, keypressType: PressType) =>
  invokeNative("execute_action", { key: keybind, pressType: keypressType });

export const createSessionId = () => crypto.randomUUID();
