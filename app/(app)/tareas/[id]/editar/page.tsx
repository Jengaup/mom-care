import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EditTaskForm, type EditTaskInitial } from "@/components/tasks/EditTaskForm";

export const dynamic = "force-dynamic";

export default async function EditarTareaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, description, category, is_active")
    .eq("id", id)
    .maybeSingle();
  if (!task) notFound();

  const { data: scheds } = await supabase
    .from("task_schedules")
    .select("time_of_day, days_of_week")
    .eq("task_id", id)
    .eq("is_active", true);

  const schedules = scheds ?? [];
  const times = schedules
    .map((s) => (s.time_of_day ?? "").slice(0, 5))
    .filter(Boolean)
    .sort();
  const firstDays = schedules[0]?.days_of_week ?? null;

  const initial: EditTaskInitial = {
    title: task.title,
    description: task.description ?? "",
    category: task.category ?? "",
    isActive: task.is_active,
    times: times.length ? times : ["08:00"],
    everyDay: !firstDays || firstDays.length === 0,
    days: firstDays ?? [],
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href="/tareas/gestionar" className="text-2xl" aria-label="Volver">
          ‹
        </Link>
        <h1 className="font-display text-2xl font-semibold text-ink">Editar tarea</h1>
      </header>
      <EditTaskForm taskId={task.id} initial={initial} />
    </div>
  );
}
