import { Outlet } from "react-router";
import { AppSidebar } from "./AppSidebar";

export function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-60 min-h-screen min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
