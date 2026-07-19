import { getActivePatient } from "@/lib/patient";
import { createClient } from "@/lib/supabase/server";
import { dayRangeUtc, formatApp, now, todayInAppTz } from "@/lib/time";
import {
  buildTaskOccurrences,
  type TaskInfo,
  type TaskLogRow,
  type TaskScheduleRow,
} from "@/lib/occurrences";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskList, type TaskDTO, type TaskGroup } from "@/components/tasks/TaskList";

export const dynamic = "force-dynamic";

export default async function TareasPage() {
  const patient = await getActivePatient();
  if (!patient) {
    return <EmptyState title="No hay un paciente asignado a tu cuenta." />;
  }

  const supabase = await createClient();
  const day = todayInAppTz();
  const { start, end } = dayRangeUtc(day);

  const { data: taskRows } = await supabase
    .from("tasks")
    .select("id, title, description, category")
    .eq("patient_id", patient.id)
    .eq("is_active", true);
  const tasks: TaskInfo[] = taskRows ?? [];
  const taskIds = tasks.map((t) => t.id);

  let schedules: TaskScheduleRow[] = [];
  let logs: TaskLogRow[] = [];
  if (taskIds.length > 0) {
    const { data: sch } = await supabase
      .from("task_schedules")
      .select("id, task_id, time_of_day, days_of_week")
      .in("task_id", taskIds)
      .eq("is_active", true);
    schedules = sch ?? [];

    const { data: lg } = await supabase
      .from("task_logs")
      .select(
        "id, task_id, schedule_id, scheduled_for, completed_at, status, note, recorded_by",
      )
      .in("task_id", taskIds)
      .gte("scheduled_for", start.toISOString())
      .lt("scheduled_for", end.toISOString());
    logs = lg ?? [];
  }

  const occurrences = buildTaskOccurrences({
    day,
    now: now(),
    graceMinutes: patient.grace_minutes,
    tasks,
    schedules,
    logs,
  });

  const groupsMap = new Map<string, TaskDTO[]>();
  for (const o of occurrences) {
    const timeLabel = formatApp(o.scheduledFor, "h:mm a");
    const dto: TaskDTO = {
      key: `${o.taskId}|${o.scheduledFor.toISOString()}`,
      taskId: o.taskId,
      scheduleId: o.scheduleId,
      title: o.title,
      category: o.category,
      scheduledForISO: o.scheduledFor.toISOString(),
      timeLabel,
      state: o.state,
    };
    const arr = groupsMap.get(timeLabel);
    if (arr) arr.push(dto);
    else groupsMap.set(timeLabel, [dto]);
  }
  const groups: TaskGroup[] = Array.from(groupsMap.entries()).map(
    ([timeLabel, items]) => ({ timeLabel, items }),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
      <TaskList groups={groups} />
    </div>
  );
}
