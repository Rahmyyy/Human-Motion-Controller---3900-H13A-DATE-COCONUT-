import { Button } from "@/components/ui/button";
import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <main className="site-page-gutter flex min-h-screen items-center justify-center bg-muted/20 py-8">
      <section className="w-full max-w-lg rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-primary">Page not found</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">This page does not exist</h1>
        <p className="mt-3 text-muted-foreground">
          The link may be out of date. Return to the dashboard to continue.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Return to dashboard</Link>
        </Button>
      </section>
    </main>
  );
}
