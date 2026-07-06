import BackButton from "@/components/BackButton";
import ActiveMappingsPanel from "./components/ActiveMappingsPanel";
import SessionStatusPanel from "./components/SessionStatusPanel";
import TriggerCountPanel from "./components/TriggerCountPanel";

export default function LiveDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Live Session Dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Monitor mappings, session duration, and triggers while a session is running.
          </p>
        </div>
        <BackButton />
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <ActiveMappingsPanel />
        <SessionStatusPanel />
        <TriggerCountPanel />
      </div>
    </main>
  );
}
