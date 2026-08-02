import { invoke } from "@tauri-apps/api/core";
import { emitTo, listen } from "@tauri-apps/api/event";
import type { SessionWindowService } from "./sessionWindowService.types";
import type { SessionSummary } from "./sessionSummary.types";

class TauriSessionWindowService implements SessionWindowService {
  openOverlay = (patientId: string, presetId: string) =>
    invoke<void>("open_overlay", { patientId, presetId });

  closeOverlay = (summary: SessionSummary) => invoke<void>("close_overlay", { summary });

  onSessionEnded = (listener: (summary: SessionSummary) => void) =>
    listen<SessionSummary>("session-ended", (event) => listener(event.payload));

  requestOverlayEnd = () => emitTo("overlay", "end-session-requested");
}

export const sessionWindowService: SessionWindowService = new TauriSessionWindowService();

export type { SessionWindowService } from "./sessionWindowService.types";
