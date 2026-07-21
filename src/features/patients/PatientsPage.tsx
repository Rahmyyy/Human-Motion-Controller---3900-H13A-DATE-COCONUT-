import { ChevronRight, UserRound } from "lucide-react";
import { Link } from "react-router";

export default function PatientsPage() {
  return (
    <section className="min-h-screen px-8 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold tracking-tight">Patients</h1>

        <ul className="mt-8 border-y">
          <li>
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <UserRound className="size-5 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">Lindsay Collins</span>
                <span className="block text-sm text-muted-foreground">View presets</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
