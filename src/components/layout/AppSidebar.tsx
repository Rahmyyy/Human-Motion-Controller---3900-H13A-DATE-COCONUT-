import { History, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Users } from "lucide-react";
import { NavLink } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigationItems = [
  { label: "Dashboard", to: "/dashboard", Icon: LayoutDashboard },
  { label: "Patients", to: "/patients", Icon: Users },
  { label: "Session History", to: "/session-history", Icon: History },
];

const navLinkClass = (isActive: boolean, isCollapsed: boolean) =>
  cn(
    "flex h-10 items-center rounded-md text-sm font-medium text-sidebar-foreground transition-colors",
    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    isCollapsed ? "justify-center px-0" : "gap-3 px-3",
    isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
  );

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ isCollapsed, onToggle }: AppSidebarProps) {
  const toggleLabel = isCollapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <aside className="fixed inset-y-0 left-0 w-[var(--sidebar-width)] overflow-hidden border-r bg-sidebar text-sidebar-foreground transition-[width] duration-150">
      <div
        className={cn(
          "flex h-16 items-center border-b",
          isCollapsed ? "justify-center px-2" : "justify-between px-3 pl-5",
        )}
      >
        <span className={cn("text-base font-semibold tracking-tight", isCollapsed && "sr-only")}>
          Human Controller
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={toggleLabel}
          aria-expanded={!isCollapsed}
          title={toggleLabel}
          onClick={onToggle}
        >
          {isCollapsed ? (
            <PanelLeftOpen aria-hidden="true" />
          ) : (
            <PanelLeftClose aria-hidden="true" />
          )}
        </Button>
      </div>

      <nav aria-label="Primary navigation" className={cn("space-y-1", isCollapsed ? "p-2" : "p-3")}>
        {navigationItems.map(({ label, to, Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={isCollapsed ? label : undefined}
            className={({ isActive }) => navLinkClass(isActive, isCollapsed)}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className={cn(isCollapsed && "sr-only")}>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
