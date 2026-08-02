import { invoke } from "@tauri-apps/api/core";
import type { RecognitionMatch } from "./types";

export async function pressMatchedKey(match: RecognitionMatch) {
  await invoke("execute_action", { key: match.keybind, press_type: match.keypressType });
}
