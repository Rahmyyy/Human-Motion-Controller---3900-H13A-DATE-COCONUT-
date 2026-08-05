import { History } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PatientHistoryEmptyStateProps {
  patientId: string | undefined;
  patientName: string;
}

/**
 * Shown when the patient has never completed a session. Distinct from a filtered-to-nothing
 * range: there is nothing to filter yet, so the page offers the way to create some history
 * instead of four empty charts.
 */
export default function PatientHistoryEmptyState({
  patientId,
  patientName,
}: PatientHistoryEmptyStateProps) {
  const navigate = useNavigate();

  return (
    <Card className="mt-6 shadow-sm">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <History className="size-6" aria-hidden="true" />
        </span>
        <h2 className="text-lg font-semibold text-foreground">No completed sessions yet</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Sessions appear here once you start one from {patientName}&apos;s presets and end it from
          the session overlay.
        </p>
        <Button
          type="button"
          className="mt-2"
          disabled={!patientId}
          onClick={() => navigate(`/patients/${patientId}/presets`, { state: { patientName } })}
        >
          Go to presets
        </Button>
      </CardContent>
    </Card>
  );
}
