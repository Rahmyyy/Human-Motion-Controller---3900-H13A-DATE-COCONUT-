import { CheckCircle2, ScanLine } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

type Props = {
  isCalibrated: boolean;
  patientId: string;
  presetId: string;
};

export default function CalibrationRequirementCard({ isCalibrated, patientId, presetId }: Props) {
  return (
    <section
      className={`mt-6 flex items-center justify-between gap-6 rounded-lg border p-4 ${
        isCalibrated ? "border-emerald-600/30 bg-emerald-50" : "border-amber-600/30 bg-amber-50"
      }`}
    >
      <div className="flex items-start gap-3">
        {isCalibrated ? (
          <CheckCircle2 className="mt-0.5 size-5 text-emerald-700" aria-hidden="true" />
        ) : (
          <ScanLine className="mt-0.5 size-5 text-amber-700" aria-hidden="true" />
        )}
        <div>
          <h2 className="text-sm font-semibold">
            {isCalibrated ? "Default resting state recorded" : "Default resting state required"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isCalibrated
              ? "Recognition is calibrated to this patient's resting posture."
              : "Record the patient's resting posture before adding movement mappings."}
          </p>
        </div>
      </div>
      <Button asChild variant={isCalibrated ? "outline" : "default"}>
        <Link to={`/patients/${patientId}/presets/${presetId}/default-pose`}>
          {isCalibrated ? "Re-record" : "Record Default State"}
        </Link>
      </Button>
    </section>
  );
}
