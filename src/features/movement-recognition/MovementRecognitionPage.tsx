import { useParams } from "react-router";
import BackButton from "@/components/BackButton";
import MediaPipePosePreview from "@/features/camera/MediaPipePosePreview";
import RecognitionStatusPanel from "./components/RecognitionStatusPanel";
import { useRecognitionRuntime } from "./hooks/useRecognitionRuntime";

export default function MovementRecognitionPage() {
  const { patientId, presetId } = useParams<{ patientId: string; presetId: string }>();
  const { error, phase, recognitionStatus } = useRecognitionRuntime(patientId, presetId);

  return (
    <main className="site-page-gutter grid h-screen w-full grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden bg-slate-50 py-8">
      <header>
        <BackButton to={`/patients/${patientId}/presets/${presetId}/edit`} />
        <div className="mt-6">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Live Recognition
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Current preset: {presetId}</p>
        </div>
      </header>

      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="grid min-h-0 min-w-0" aria-label="Live camera recognition">
          <MediaPipePosePreview />
        </section>
        <RecognitionStatusPanel
          isLoading={phase === "loading"}
          loadError={error}
          status={recognitionStatus}
        />
      </div>
    </main>
  );
}
