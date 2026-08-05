import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import needsAttention from "../data/needsAttention.json";

export default function NeedsAttentionCard() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-600" aria-hidden="true" />
          Needs Attention
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-3">
        {needsAttention.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900 dark:bg-amber-950/20"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-semibold text-white">
              !
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.patientName}</p>
              <p className="truncate text-xs text-muted-foreground">{item.message}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{item.dueDateLabel}</span>
          </div>
        ))}
        <p className="pt-1 text-xs text-muted-foreground">Placeholder data for a future feature.</p>
      </CardContent>
    </Card>
  );
}
