import CameraPreview from "../camera/CameraPreview";
import AnnotatedPreview from "../camera/AnnotatedPreview";

import styles from "./SessionPage.module.css";

export default function SessionPage() {

  return (
    <section className={styles.page}>
      <h1>Motion Session</h1>

      <AnnotatedPreview />
      <CameraPreview />

    </section>
  );
}
