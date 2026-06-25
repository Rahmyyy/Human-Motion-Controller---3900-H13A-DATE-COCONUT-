import { Input } from "@/components/ui/input";
import { SlidersHorizontal } from "lucide-react";

export default function MappingDetailsPanel() {
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
        <span className="text-xs font-medium text-muted-foreground">Movement Name</span>
        <Input />
      </div>

      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Target Key Action</span>
        <Input />
      </div>
    </section>
  );
}
