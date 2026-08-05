import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HistoryPanelProps {
  /** Rendered beside the title, for legends and captions. */
  action?: ReactNode;
  children: ReactNode;
  description?: string;
  /** Height of the loading placeholder, matched to the panel's final body. */
  skeletonClassName?: string;
  emptyMessage?: string;
  error: string | null;
  isEmpty: boolean;
  isLoading: boolean;
  onRetry: () => void;
  onShowAllTime?: () => void;
  title: string;
}

/**
 * The shared frame for the history charts and table. Each panel owns its own loading, empty and
 * error body so one failure never leaves the page half-rendered with no explanation.
 */
export default function HistoryPanel({
  action,
  children,
  description,
  skeletonClassName = "h-[260px]",
  emptyMessage = "No sessions in this range.",
  error,
  isEmpty,
  isLoading,
  onRetry,
  onShowAllTime,
  title,
}: HistoryPanelProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {!isLoading && !error && !isEmpty ? action : null}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className={`w-full animate-pulse rounded-lg bg-muted ${skeletonClassName}`} />
        ) : error ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-start gap-3 py-10">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            {onShowAllTime ? (
              <Button type="button" variant="outline" size="sm" onClick={onShowAllTime}>
                Show all time
              </Button>
            ) : null}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
