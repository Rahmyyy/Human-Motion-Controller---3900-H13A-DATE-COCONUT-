import { useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

import { exportPatient } from "@/modules/patient-presets";

interface ExportPatientButtonProps {
  patientId: string | undefined;
  patientName: string;
}

export default function ExportPatientButton({ patientId, patientName }: ExportPatientButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!patientId || isExporting) return;

    setError(null);

    const filePath = await save({
      defaultPath: `${patientName}.json`,
      filters: [{ name: "Patient Profile", extensions: ["json"] }],
    });

    // User cancelled the save dialog — clean no-op, not an error.
    if (!filePath) return;

    setIsExporting(true);
    try {
      await exportPatient(patientId, filePath);
    } catch (error) {
      console.error("Failed to export patient", error);
      setError("This patient could not be exported. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" variant="outline" onClick={handleExport} disabled={isExporting}>
        <Download className="size-4" aria-hidden="true" />
        {isExporting ? "Exporting…" : "Export Patient"}
      </Button>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
