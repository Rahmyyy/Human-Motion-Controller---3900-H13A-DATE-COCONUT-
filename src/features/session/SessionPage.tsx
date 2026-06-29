import { Button } from "@/components/ui/button";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import CameraPreview from "../camera/CameraPreview";
import { useCamera } from "../camera/useCamera";
import styles from "./SessionPage.module.css";

export default function SessionPage() {
  const { stream, status, error, start, stop } = useCamera();
  const [keyError, setKeyError] = useState<string | null>(null);

  async function handleTestKey() {
    setKeyError(null);
    try {
      await invoke("press_key");
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section className={styles.page}>
      <h1>Motion Session</h1>

      <CameraPreview stream={stream} />

      <div className={styles.controls}>
        {status === "active" ? (
          <Button type="button" onClick={stop} variant="destructive">
            Stop camera
          </Button>
        ) : (
          <Button type="button" onClick={() => void start()} disabled={status === "starting"}>
            {status === "starting" ? "Starting camera…" : "Start camera"}
          </Button>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <Button type="button" onClick={() => void handleTestKey()}>
          Test W key
        </Button>

        {keyError && (
          <p className={styles.error} role="alert">
            Key injection failed: {keyError}
          </p>
        )}
      </div>
    </section>
  );
}
