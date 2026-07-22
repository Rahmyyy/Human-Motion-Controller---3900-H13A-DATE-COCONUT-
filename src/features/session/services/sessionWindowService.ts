import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { SessionWindowService } from "./sessionWindowService.types";

class TauriSessionWindowService implements SessionWindowService {
  openOverlay = (presetId: string) => invoke<void>("open_overlay", { presetId });

  closeOverlay = () => invoke<void>("close_overlay");

  onSessionEnded = (listener: () => void) => listen("session-ended", listener);
}

export const sessionWindowService: SessionWindowService = new TauriSessionWindowService();

export type { SessionWindowService } from "./sessionWindowService.types";
