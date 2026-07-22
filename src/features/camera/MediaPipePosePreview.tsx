import { useCallback, useState } from "react";
import { drawPoseFrame } from "./drawPoseFrame";
import { usePoseFrames, usePoseService } from "./hooks/usePoseService";
import styles from "./MediaPipePosePreview.module.css";

export default function MediaPipePosePreview() {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const { status, error, retry } = usePoseService(video);
  const drawFrame = useCallback(
    (frame: Parameters<typeof drawPoseFrame>[1]) => {
      if (!canvas || !video || !video.videoWidth || !video.videoHeight) return;
      drawPoseFrame(canvas, frame, { width: video.videoWidth, height: video.videoHeight });
    },
    [canvas, video],
  );
  usePoseFrames(drawFrame);

  return (
    <section className={styles.panel} aria-label="MediaPipe pose preview">
      <div className={styles.stage}>
        <video ref={setVideo} className={styles.video} playsInline muted aria-label="Camera feed" />
        <canvas ref={setCanvas} className={styles.overlay} />

        {status === "loading" && <p className={styles.message}>Loading pose model...</p>}
        {status === "error" && (
          <div className={styles.error}>
            <p>{error}</p>
            <button type="button" className={styles.retry} onClick={retry}>
              Try again
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
