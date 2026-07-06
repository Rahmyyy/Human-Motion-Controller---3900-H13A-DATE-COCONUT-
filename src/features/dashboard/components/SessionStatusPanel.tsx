export default function SessionStatusPanel() {
  return (
    <section className="grid content-start gap-4 rounded-lg border bg-background p-5 shadow-sm">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold text-foreground">Session Status</h2>
        <p className="text-sm text-muted-foreground">Current state and elapsed time.</p>
      </header>
      <div className="grid gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Status
        </span>
        <span className="text-lg font-semibold text-foreground">Idle</span>
      </div>
      <div className="grid gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Duration
        </span>
        <span className="text-lg font-semibold text-foreground">00:00</span>
      </div>
    </section>
  );
}
