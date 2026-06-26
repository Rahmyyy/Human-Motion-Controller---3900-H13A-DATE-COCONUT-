import { Input } from "@/components/ui/input";
import { Pencil, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

export default function MappingDetailsPanel() {
  const [movementName, setMovementName] = useState("");

  return (
    <section className="grid content-start gap-4 rounded-lg border bg-background p-5 shadow-sm">
      <header className="grid gap-1">
        <h2 className="m-0 flex items-center gap-2 text-base font-semibold text-foreground">
          <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
          Mapping Details
        </h2>
        <p className="m-0 text-sm text-muted-foreground">Configure movement properties.</p>
      </header>

      <div className="grid gap-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="movement-name">
          Movement Name
        </label>
        <div className="relative">
          <Input
            id="movement-name"
            value={movementName}
            onChange={(event) => setMovementName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            placeholder="Name this movement"
            className="pr-9"
          />
          <Pencil
            className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="target-key-action">
          Target Key Action
        </label>
        <div className="relative">
          <Input id="target-key-action" placeholder="Press a key to bind" className="pr-9" />
          <Pencil
            className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
