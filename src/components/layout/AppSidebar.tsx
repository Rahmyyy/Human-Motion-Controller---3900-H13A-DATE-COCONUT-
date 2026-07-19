import { Users } from "lucide-react";
import { NavLink } from "react-router";
import { cn } from "@/lib/utils";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground transition-colors",
    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
  );

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 w-60 border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b px-5">
        <span className="text-base font-semibold tracking-tight">Human Controller</span>
      </div>

      <nav aria-label="Primary navigation" className="p-3">
        <NavLink to="/patients" className={navLinkClass}>
          <Users className="size-4" aria-hidden="true" />
          Patients
        </NavLink>
      </nav>
    </aside>
  );
}
