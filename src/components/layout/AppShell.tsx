import { useState, type CSSProperties } from "react";
import { Outlet } from "react-router";
import { AppSidebar } from "./AppSidebar";

export function AppShell() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const shellStyle = {
    "--sidebar-width": isSidebarCollapsed ? "4rem" : "15rem",
  } as CSSProperties;

  return (
    <div className="min-h-screen bg-background" style={shellStyle}>
      <AppSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((isCollapsed) => !isCollapsed)}
      />
      <main className="ml-[var(--sidebar-width)] min-h-screen min-w-0 transition-[margin-left] duration-150">
        <Outlet />
      </main>
    </div>
  );
}
