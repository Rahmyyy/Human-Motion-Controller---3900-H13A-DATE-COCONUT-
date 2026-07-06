import type { PresetMappingCardData } from "@/features/preset-mapping/types";

interface ActiveMappingsPanelProps {
  mappings: PresetMappingCardData[];
  isLoading: boolean;
  loadError: string | null;
}

export default function ActiveMappingsPanel({
  mappings,
  isLoading,
  loadError,
}: ActiveMappingsPanelProps) {
  return (
    <section className="grid content-start gap-4 rounded-lg border bg-background p-5 shadow-sm">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold text-foreground">Active Mappings</h2>
        <p className="text-sm text-muted-foreground">Movement-to-key bindings for this session.</p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading mappings.</p>
      ) : mappings.length > 0 ? (
        <ul className="grid gap-3">
          {mappings.map((mapping) => (
            <li
              key={mapping.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <span className="truncate text-sm font-medium text-foreground">{mapping.name}</span>
              <kbd className="rounded-md bg-slate-700 px-2.5 py-1 font-mono text-xs font-semibold text-white">
                {mapping.keybind}
              </kbd>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No mappings saved.</p>
      )}

      {loadError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {loadError}
        </p>
      )}
    </section>
  );
}
