import { useSyncExternalStore } from "react";
import { getTriggerCount, subscribe } from "@/lib/liveSessionState";

export default function TriggerCountPanel() {
  const triggerCount = useSyncExternalStore(subscribe, getTriggerCount);

  return (
    <section className="grid content-start gap-4 rounded-lg border bg-background p-5 shadow-sm">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold text-foreground">Successful Triggers</h2>
        <p className="text-sm text-muted-foreground">Movements that fired a keypress.</p>
      </header>
      <span className="text-3xl font-semibold text-foreground">{triggerCount}</span>
    </section>
  );
}
