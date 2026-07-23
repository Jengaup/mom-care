import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import { loadMedicationToday, loadTaskToday } from "@/lib/today";
import { groupMedOccurrences, groupTaskOccurrences } from "@/lib/dto";
import { createClient } from "@/lib/supabase/server";
import { formatApp, formatTime, now, todayInAppTz } from "@/lib/time";
import { isActionableNow } from "@/lib/occurrences";
import { OBS_CONFIG, formatObsValue, type ObsType } from "@/lib/observations";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MedicationList } from "@/components/medications/MedicationList";
import { TaskList } from "@/components/tasks/TaskList";
import {
  ActivityFeed,
  type ActivityItem,
} from "@/components/activity/ActivityFeed";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  const patient = await getActivePatient();
  const today = todayInAppTz();

  if (!patient) {
    return (
      <EmptyState title="No hay un paciente asignado a tu cuenta." />
    );
  }

  const supabase = await createClient();
  const [{ occurrences: medOccs, prn }, { occurrences: taskOccs }] =
    await Promise.all([loadMedicationToday(patient), loadTaskToday(patient)]);

  const actionableMeds = medOccs.filter((o) => isActionableNow(o.state));
  const pendingMeds = medOccs.filter((o) => o.state === "pending");
  const actionableTasks = taskOccs.filter((o) => isActionableNow(o.state));
  const pendingTasks = taskOccs.filter((o) => o.state === "pending");

  const [
    { data: nextAppt },
    { data: todayNote },
    { data: activity },
    { data: lastObs },
  ] = await Promise.all([
      supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", patient.id)
        .eq("status", "upcoming")
        .gte("scheduled_at", now().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("daily_notes")
        .select("content")
        .eq("patient_id", patient.id)
        .eq("note_date", today)
        .eq("author_id", user!.id)
        .maybeSingle(),
      supabase
        .from("activity_logs")
        .select("id, action, metadata, actor_id, created_at")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("observations")
        .select("type, value_num, value_text, unit, measured_at")
        .eq("patient_id", patient.id)
        .order("measured_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  // Nombres de actores para el feed.
  const actorIds = Array.from(
    new Set((activity ?? []).map((a) => a.actor_id).filter(Boolean)),
  ) as string[];
  const actorName = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);
    for (const p of profs ?? []) actorName.set(p.id, p.full_name ?? "—");
  }
  const activityItems: ActivityItem[] = (activity ?? []).map((a) => ({
    id: a.id,
    action: a.action,
    metadata: (a.metadata ?? {}) as Record<string, unknown>,
    actorName: a.actor_id ? actorName.get(a.actor_id) ?? null : null,
    createdAt: a.created_at,
  }));

  const nowCount = actionableMeds.length + actionableTasks.length;
  const nothingNow = nowCount === 0;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        {formatApp(`${today}T12:00:00`, "EEEE, d 'de' MMMM")}
        {user?.fullName ? ` · Hola, ${user.fullName.split(" ")[0]}` : ""}
      </p>

      {/* Hero: el estado del cuidado ahora mismo (la tesis de la pantalla) */}
      {nothingNow ? (
        <section className="rounded-2xl border border-brand/20 bg-brand-soft p-5">
          <p className="font-display text-2xl font-semibold text-brand-dark">
            Todo al día
          </p>
          <p className="mt-1 text-muted">Nada requiere atención ahora mismo.</p>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="rounded-2xl border border-line border-l-[6px] border-l-status-late bg-surface p-5 shadow-card">
            <p className="font-display text-2xl font-semibold text-ink">
              {nowCount}{" "}
              {nowCount === 1 ? "cosa requiere" : "cosas requieren"} atención ahora
            </p>
            <p className="mt-1 text-muted">
              Medicamentos o tareas atrasados o que tocan.
            </p>
          </div>
          {actionableMeds.length > 0 ? (
            <MedicationList
              groups={groupMedOccurrences(actionableMeds)}
              prn={[]}
              hidePrn
            />
          ) : null}
          {actionableTasks.length > 0 ? (
            <TaskList groups={groupTaskOccurrences(actionableTasks)} />
          ) : null}
        </section>
      )}

      {/* (b) Medicamentos pendientes (más tarde hoy) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">
            Medicamentos pendientes
          </h2>
          <Link href="/medicamentos" className="text-sm font-semibold text-brand-dark">
            Ver todos
          </Link>
        </div>
        {pendingMeds.length === 0 ? (
          <EmptyState title="Sin medicamentos pendientes más tarde" />
        ) : (
          <Card className="divide-y divide-line p-0">
            {pendingMeds.map((o) => (
              <div
                key={`${o.medicationId}|${o.scheduledFor.toISOString()}`}
                className="flex items-center justify-between p-3"
              >
                <span className="truncate text-base text-ink">
                  {o.name}
                  {o.dose != null ? ` ${o.dose}${o.unit ? ` ${o.unit}` : ""}` : ""}
                </span>
                <span className="shrink-0 text-sm font-medium text-muted">
                  {formatTime(o.scheduledFor)}
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* (c) Tareas pendientes */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Tareas pendientes</h2>
          <Link href="/tareas" className="text-sm font-semibold text-brand-dark">
            Ver todas
          </Link>
        </div>
        {pendingTasks.length === 0 ? (
          <EmptyState title="Sin tareas pendientes más tarde" />
        ) : (
          <Card className="divide-y divide-line p-0">
            {pendingTasks.map((o) => (
              <div
                key={`${o.taskId}|${o.scheduledFor.toISOString()}`}
                className="flex items-center justify-between p-3"
              >
                <span className="truncate text-base text-ink">
                  {o.title}
                </span>
                <span className="shrink-0 text-sm font-medium text-muted">
                  {formatTime(o.scheduledFor)}
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* (c2) Signos */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Signos</h2>
          <Link href="/signos" className="text-sm font-semibold text-brand-dark">
            Registrar
          </Link>
        </div>
        <Link href="/signos">
          <Card className="active:bg-black/[0.03]">
            {lastObs ? (
              <>
                <p className="text-base font-semibold text-ink">
                  {OBS_CONFIG[lastObs.type as ObsType].label}:{" "}
                  {formatObsValue(
                    lastObs.type as ObsType,
                    lastObs.value_num,
                    lastObs.value_text,
                    lastObs.unit,
                  )}
                </p>
                <p className="text-sm text-muted">
                  {formatApp(lastObs.measured_at, "EEEE d MMM, h:mm a")}
                </p>
              </>
            ) : (
              <p className="text-muted">
                Registra peso, presión, temperatura y más.
              </p>
            )}
          </Card>
        </Link>
      </section>

      {/* (c3) Contactos */}
      <Link href="/contactos" className="block">
        <Card className="flex items-center justify-between active:bg-black/[0.03]">
          <div>
            <p className="text-base font-semibold text-ink">
              Contactos y emergencia
            </p>
            <p className="text-sm text-muted">
              Médicos, familia y datos clave a un toque.
            </p>
          </div>
          <span className="text-xl text-muted">›</span>
        </Card>
      </Link>

      {/* (d) Próxima cita */}
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-ink">Próxima cita</h2>
        {nextAppt ? (
          <Link href={`/citas/${nextAppt.id}`}>
            <Card className="active:bg-black/[0.03]">
              <p className="text-base font-semibold text-ink">
                {nextAppt.title}
              </p>
              <p className="text-sm text-muted">
                {formatApp(nextAppt.scheduled_at, "EEEE d MMM, h:mm a")}
                {nextAppt.doctor_name ? ` · ${nextAppt.doctor_name}` : ""}
              </p>
            </Card>
          </Link>
        ) : (
          <EmptyState
            title="No hay citas próximas"
            hint={user?.role === "admin" ? "Añádela desde Citas." : undefined}
          />
        )}
      </section>

      {/* (e) Nota del día */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Nota de hoy</h2>
          <Link href="/notas" className="text-sm font-semibold text-brand-dark">
            {todayNote?.content ? "Editar" : "Añadir"}
          </Link>
        </div>
        <Card>
          {todayNote?.content ? (
            <p className="whitespace-pre-wrap text-ink">
              {todayNote.content}
            </p>
          ) : (
            <p className="text-muted">Aún no has escrito la nota de hoy.</p>
          )}
        </Card>
      </section>

      {/* (f) Actividad reciente */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Actividad reciente</h2>
          <div className="flex gap-3">
            <Link href="/reporte" className="text-sm font-semibold text-brand-dark">
              Reporte
            </Link>
            <Link href="/historial" className="text-sm font-semibold text-brand-dark">
              Historial
            </Link>
          </div>
        </div>
        <ActivityFeed items={activityItems} />
      </section>
    </div>
  );
}
