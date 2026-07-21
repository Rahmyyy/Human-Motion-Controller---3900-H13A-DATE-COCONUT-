export default function PatientListPage() {
  return (
    <section className="min-h-screen bg-background px-8 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Welcome back, Dr. Smith
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Select a patient to view their available preset mappings.
            </p>
          </div>
        </header>

        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight">
            Recent Patients
          </h2>
        </section>
      </div>
    </section>
  );
}