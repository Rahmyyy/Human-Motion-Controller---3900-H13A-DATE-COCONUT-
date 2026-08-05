import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface DashboardMetricCardProps {
  description: string;
  icon: LucideIcon;
  label: string;
  value: number;
}

export default function DashboardMetricCard({
  description,
  icon: Icon,
  label,
  value,
}: DashboardMetricCardProps) {
  return (
    <Card className="justify-center py-5 shadow-sm">
      <CardContent className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <div>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <p className="font-medium">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
