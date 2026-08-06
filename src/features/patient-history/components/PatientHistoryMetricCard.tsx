import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PatientHistoryMetricCardProps {
  description?: string;
  icon: LucideIcon;
  label: string;
  /** Pre-formatted, so the card can show "1h 42m" as readily as "8". */
  value: string;
}

export default function PatientHistoryMetricCard({
  description,
  icon: Icon,
  label,
  value,
}: PatientHistoryMetricCardProps) {
  return (
    <Card className="justify-center py-5 shadow-sm">
      <CardContent className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <p className="font-medium">{label}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
