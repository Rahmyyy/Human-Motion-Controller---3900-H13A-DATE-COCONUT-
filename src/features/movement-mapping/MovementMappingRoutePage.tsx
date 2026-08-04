import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import MovementMappingWorkspace from "./components/MovementMappingWorkspace";
import { useMappingEditor } from "./hooks/useMappingEditor";

export default function MovementMappingRoutePage() {
  const { mappingId, patientId, presetId } = useParams<{
    mappingId?: string;
    patientId: string;
    presetId: string;
  }>();
  const navigate = useNavigate();
  const editor = useMappingEditor(patientId, presetId, mappingId);
  const isEdit = Boolean(mappingId);

  useEffect(() => {
    if (!isEdit && editor.status === "needs-calibration" && presetId) {
      navigate(`/patients/${patientId}/presets/${presetId}/default-pose`, { replace: true });
    } else if (editor.status === "saved" && presetId && (!isEdit || Boolean(patientId))) {
      navigate(`/patients/${patientId}/presets/${presetId}/edit`);
    }
  }, [editor.status, isEdit, navigate, patientId, presetId]);

  if (isEdit && editor.status === "error") {
    return <MappingMessage message={editor.error ?? ""} />;
  }

  if (editor.status !== "ready" && editor.status !== "saving") {
    return (
      <MappingMessage
        message={
          isEdit ? "Loading mapping..." : (editor.error ?? "Checking default-pose calibration...")
        }
      />
    );
  }

  return (
    <MovementMappingWorkspace
      editor={editor}
      presentation={{
        backTo: `/patients/${patientId}/presets/${presetId}/edit`,
        title: isEdit ? "Edit Mapping" : "Record and Map New Movement",
        description: isEdit
          ? "Review the saved movement and adjust its mapping details."
          : "Capture a physical movement and assign it to a keybind.",
      }}
    />
  );
}

function MappingMessage({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-8">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
