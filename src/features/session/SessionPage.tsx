import CameraPreview from "../camera/CameraPreview";
import { useCamera } from "../camera/useCamera";
import styles from "./SessionPage.module.css";

export default function SessionPage() {
  const { stream, status, error, start, stop } = useCamera();

  return (
    <section className={styles.page}>
      <h1>Motion Session</h1>

      <CameraPreview stream={stream} />

      <div className={styles.controls}>
        {status === "active" ? (
          <button type="button" onClick={stop}>
            Stop camera
          </button>
        ) : (
          <button type="button" onClick={() => void start()} disabled={status === "starting"}>
            {status === "starting" ? "Starting camera…" : "Start camera"}
          </button>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
