import { invoke } from "@tauri-apps/api/core";
import type { RecognitionMatch } from "./types";

export async function pressMatchedKey(match: RecognitionMatch) {
  await invoke("press_key", { key: match.keybind });
}
