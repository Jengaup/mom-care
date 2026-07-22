import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import { createClient } from "@/lib/supabase/server";
import { formatApp, now } from "@/lib/time";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Tables } from "@/types/database";

export const dynamic = "force-dynamic";

function AppointmentRow({ appt }: { appt: Tables<"appointments"> }) {
  return (
    <Link href={`/citas/${appt.id}`}>
      <Card className="active:bg-black/[0.03]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-ink">
              {appt.title}
            </p>
            <p className="truncate text-sm text-muted">
              {appt.doctor_name ?? ""}
              {appt.specialty ? ` · ${appt.specialty}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-medium text-ink/80">
              {formatApp(appt.scheduled_at, "d MMM")}
            </p>
            <p className="text-sm text-muted">
              {formatApp(appt.scheduled_at, "h:mm a")}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default async function CitasPage() {
  const patient = await getActivePatient();
  if (!patient) {
    return <EmptyState title="No hay un paciente asignado a tu cuenta." />;
  }

  const user = await getSessionUser();
  const supabase = await createClient();
  const nowISO = now().toISOString();

  const { data: upcoming } = await supabase
    .from("appointments")
    .select("*")
    .eq("patient_id", patient.id)
    .eq("status", "upcoming")
    .gte("scheduled_at", nowISO)
    .order("scheduled_at", { ascending: true });

  const { data: past } = await supabase
    .from("appointments")
    .select("*")
    .eq("patient_id", patient.id)
    .or(`status.neq.upcoming,scheduled_at.lt.${nowISO}`)
    .order("scheduled_at", { ascending: false })
    .limit(30);

  const upcomingList = upcoming ?? [];
  const pastList = past ?? [];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Citas</h1>
        {user?.role === "admin" ? (
          <Link
            href="/citas/nueva"
            className="min-h-touch inline-flex items-center rounded-xl bg-brand px-4 font-semibold text-white"
          >
            + Nuevo
          </Link>
        ) : null}
      </header>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-bold uppercase tracking-wide text-muted">
          Próximas
        </h2>
        {upcomingList.length === 0 ? (
          <EmptyState title="No hay citas próximas" />
        ) : (
          upcomingList.map((a) => <AppointmentRow key={a.id} appt={a} />)
        )}
      </section>

      {pastList.length > 0 ? (
        <details className="group">
          <summary className="min-h-touch flex cursor-pointer items-center px-1 text-sm font-bold uppercase tracking-wide text-muted">
            Pasadas ({pastList.length})
          </summary>
          <div className="mt-2 space-y-2">
            {pastList.map((a) => (
              <AppointmentRow key={a.id} appt={a} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
