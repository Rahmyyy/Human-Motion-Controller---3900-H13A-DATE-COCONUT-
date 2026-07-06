export default function ActiveMappingsPanel() {
  return (
    <section className="grid content-start gap-4 rounded-lg border bg-background p-5 shadow-sm">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold text-foreground">Active Mappings</h2>
        <p className="text-sm text-muted-foreground">Movement-to-key bindings for this session.</p>
      </header>
      <p className="text-sm text-muted-foreground">No mappings loaded yet.</p>
    </section>
  );
}
