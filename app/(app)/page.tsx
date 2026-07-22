import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import { loadMedicationToday, loadTaskToday } from "@/lib/today";
import { groupMedOccurrences, groupTaskOccurrences } from "@/lib/dto";
import { createClient } from "@/lib/supabase/server";
import { formatApp, formatTime, now, todayInAppTz } from "@/lib/time";
import { isActionableNow } from "@/lib/occurrences";
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

  const [{ data: nextAppt }, { data: todayNote }, { data: activity }] =
    await Promise.all([
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

  const nothingNow = actionableMeds.length === 0 && actionableTasks.length === 0;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-gray-500">
          {formatApp(`${today}T12:00:00`, "EEEE, d 'de' MMMM")}
        </p>
        <h1 className="text-2xl font-bold text-gray-900">
          Hola{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}
        </h1>
      </header>

      {/* (a) Ahora / atrasado */}
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-status-late">Ahora / atrasado</h2>
        {nothingNow ? (
          <EmptyState title="Nada pendiente ahora mismo 🎉" />
        ) : (
          <div className="space-y-3">
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
          </div>
        )}
      </section>

      {/* (b) Medicamentos pendientes (más tarde hoy) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            Medicamentos pendientes
          </h2>
          <Link href="/medicamentos" className="text-sm text-status-done">
            Ver todos
          </Link>
        </div>
        {pendingMeds.length === 0 ? (
          <EmptyState title="Sin medicamentos pendientes más tarde" />
        ) : (
          <Card className="divide-y divide-gray-100 p-0">
            {pendingMeds.map((o) => (
              <div
                key={`${o.medicationId}|${o.scheduledFor.toISOString()}`}
                className="flex items-center justify-between p-3"
              >
                <span className="truncate text-base text-gray-800">
                  {o.name}
                  {o.dose != null ? ` ${o.dose}${o.unit ? ` ${o.unit}` : ""}` : ""}
                </span>
                <span className="shrink-0 text-sm font-medium text-gray-500">
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
          <h2 className="text-lg font-bold text-gray-900">Tareas pendientes</h2>
          <Link href="/tareas" className="text-sm text-status-done">
            Ver todas
          </Link>
        </div>
        {pendingTasks.length === 0 ? (
          <EmptyState title="Sin tareas pendientes más tarde" />
        ) : (
          <Card className="divide-y divide-gray-100 p-0">
            {pendingTasks.map((o) => (
              <div
                key={`${o.taskId}|${o.scheduledFor.toISOString()}`}
                className="flex items-center justify-between p-3"
              >
                <span className="truncate text-base text-gray-800">
                  {o.title}
                </span>
                <span className="shrink-0 text-sm font-medium text-gray-500">
                  {formatTime(o.scheduledFor)}
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* (d) Próxima cita */}
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-gray-900">Próxima cita</h2>
        {nextAppt ? (
          <Link href={`/citas/${nextAppt.id}`}>
            <Card className="active:bg-gray-50">
              <p className="text-base font-semibold text-gray-900">
                {nextAppt.title}
              </p>
              <p className="text-sm text-gray-500">
                {formatApp(nextAppt.scheduled_at, "EEEE d MMM, h:mm a")}
                {nextAppt.doctor_name ? ` · ${nextAppt.doctor_name}` : ""}
              </p>
            </Card>
          </Link>
        ) : (
          <EmptyState title="No hay citas próximas" />
        )}
      </section>

      {/* (e) Nota del día */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Nota de hoy</h2>
          <Link href="/notas" className="text-sm text-status-done">
            {todayNote?.content ? "Editar" : "Añadir"}
          </Link>
        </div>
        <Card>
          {todayNote?.content ? (
            <p className="whitespace-pre-wrap text-gray-800">
              {todayNote.content}
            </p>
          ) : (
            <p className="text-gray-400">Aún no has escrito la nota de hoy.</p>
          )}
        </Card>
      </section>

      {/* (f) Actividad reciente */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Actividad reciente</h2>
          <div className="flex gap-3">
            <Link href="/reporte" className="text-sm text-status-done">
              Reporte
            </Link>
            <Link href="/historial" className="text-sm text-status-done">
              Historial
            </Link>
          </div>
        </div>
        <ActivityFeed items={activityItems} />
      </section>
    </div>
  );
}
