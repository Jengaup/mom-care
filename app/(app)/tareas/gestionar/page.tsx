import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskManageList, type ManageTask } from "@/components/tasks/TaskManageList";

export const dynamic = "force-dynamic";

export default async function GestionarTareasPage() {
  await requireRole("admin");
  const patient = await getActivePatient();
  if (!patient) return <EmptyState title="No hay un paciente activo." />;
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, category, is_active")
    .eq("patient_id", patient.id)
    .order("is_active", { ascending: false })
    .order("title");
  const taskList = tasks ?? [];
  const taskIds = taskList.map((t) => t.id);

  const { data: scheds } = taskIds.length
    ? await supabase
        .from("task_schedules")
        .select("task_id, time_of_day")
        .in("task_id", taskIds)
        .eq("is_active", true)
    : { data: [] };
  const timesByTask = new Map<string, string[]>();
  for (const s of scheds ?? []) {
    const arr = timesByTask.get(s.task_id) ?? [];
    arr.push((s.time_of_day ?? "").slice(0, 5));
    timesByTask.set(s.task_id, arr);
  }

  const items: ManageTask[] = taskList.map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    times: (timesByTask.get(t.id) ?? []).sort().join(", ") || "Sin horario",
    isActive: t.is_active,
  }));

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Tareas</h1>
        <Link
          href="/tareas/nuevo"
          className="min-h-touch inline-flex items-center rounded-xl bg-brand px-4 font-semibold text-white"
        >
          + Nuevo
        </Link>
      </header>
      <TaskManageList tasks={items} />
    </div>
  );
}
