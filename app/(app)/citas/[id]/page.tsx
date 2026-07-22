import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatApp } from "@/lib/time";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CompleteAppointmentForm } from "@/components/appointments/CompleteAppointmentForm";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  upcoming: "Próxima",
  completed: "Completada",
  cancelled: "Cancelada",
  rescheduled: "Reprogramada",
};

export default async function CitaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  const supabase = await createClient();

  const { data: appt } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!appt) notFound();

  const { data: notes } = await supabase
    .from("appointment_notes")
    .select("*")
    .eq("appointment_id", id)
    .order("created_at", { ascending: false });

  const mapsHref = appt.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appt.address)}`
    : null;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href="/citas" className="text-2xl" aria-label="Volver">
          ‹
        </Link>
        <h1 className="truncate font-display text-2xl font-semibold text-ink">
          {appt.title}
        </h1>
      </header>

      <Card className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-status-pending">
          {STATUS_LABEL[appt.status] ?? appt.status}
        </p>
        <p className="text-lg font-medium text-ink">
          {formatApp(appt.scheduled_at, "EEEE d 'de' MMMM, h:mm a")}
        </p>
        {appt.doctor_name ? (
          <p className="text-ink/80">
            {appt.doctor_name}
            {appt.specialty ? ` · ${appt.specialty}` : ""}
          </p>
        ) : null}
        {appt.clinic ? <p className="text-muted">{appt.clinic}</p> : null}
        {appt.address ? <p className="text-muted">{appt.address}</p> : null}
        {appt.notes ? <p className="text-muted">{appt.notes}</p> : null}
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {appt.phone ? (
          <a href={`tel:${appt.phone}`}>
            <Button variant="secondary" className="w-full">
              Llamar
            </Button>
          </a>
        ) : null}
        {mapsHref ? (
          <a href={mapsHref} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" className="w-full">
              Ver en mapa
            </Button>
          </a>
        ) : null}
      </div>

      {/* Notas de la cita */}
      {notes && notes.length > 0 ? (
        <Card className="space-y-2">
          <h2 className="text-lg font-bold text-ink">Notas</h2>
          {notes.map((n) => (
            <div key={n.id} className="space-y-1 border-t border-line pt-2 first:border-0 first:pt-0">
              {n.summary ? <p className="text-ink">{n.summary}</p> : null}
              {n.next_steps ? (
                <p className="text-sm text-muted">
                  <strong>Próximos pasos:</strong> {n.next_steps}
                </p>
              ) : null}
              {n.medication_changes ? (
                <p className="text-sm text-muted">
                  <strong>Medicamentos:</strong> {n.medication_changes}
                </p>
              ) : null}
              {n.next_appointment_at ? (
                <p className="text-sm text-muted">
                  <strong>Próxima cita:</strong>{" "}
                  {formatApp(n.next_appointment_at, "d MMM yyyy, h:mm a")}
                </p>
              ) : null}
            </div>
          ))}
        </Card>
      ) : null}

      {appt.status !== "completed" && user?.role === "admin" ? (
        <CompleteAppointmentForm appointmentId={appt.id} />
      ) : null}
    </div>
  );
}
