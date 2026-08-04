import { invoke } from "@tauri-apps/api/core";
import type { NativeCommandArgs, NativeCommandName, NativeCommandResult } from "./commands";
import { normalizeNativeError } from "./error";

type NativeArgsTuple<K extends NativeCommandName> =
  NativeCommandArgs<K> extends undefined ? [] : [args: NativeCommandArgs<K>];

/** The sole typed command invocation seam. Command names cannot drift from NativeCommandMap. */
export async function invokeNative<K extends NativeCommandName>(
  command: K,
  ...args: NativeArgsTuple<K>
): Promise<NativeCommandResult<K>> {
  try {
    return await invoke<NativeCommandResult<K>>(
      command,
      args[0] as Record<string, unknown> | undefined,
    );
  } catch (error) {
    throw normalizeNativeError(error);
  }
}
