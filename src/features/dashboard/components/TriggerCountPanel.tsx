export default function TriggerCountPanel() {
  return (
    <section className="grid content-start gap-4 rounded-lg border bg-background p-5 shadow-sm">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold text-foreground">Successful Triggers</h2>
        <p className="text-sm text-muted-foreground">Movements that fired a keypress.</p>
      </header>
      <span className="text-3xl font-semibold text-foreground">0</span>
    </section>
  );
}
