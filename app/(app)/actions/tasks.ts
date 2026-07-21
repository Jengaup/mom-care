"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import type { TablesInsert } from "@/types/database";

export type TaskStatus = "done" | "skipped";

export type RecordTaskResult =
  | { ok: true }
  | {
      ok: false;
      conflict: true;
      recordedByName: string | null;
      completedAt: string | null;
      status: TaskStatus;
    }
  | { ok: false; conflict: false; message: string };

/** Registra una tarea (completada/omitida). Anti-doble por (task_id, scheduled_for). */
export async function recordTask(input: {
  taskId: string;
  scheduleId: string;
  scheduledForISO: string;
  status: TaskStatus;
  note?: string | null;
}): Promise<RecordTaskResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const nowISO = new Date().toISOString();

  const { error } = await supabase.from("task_logs").insert({
    task_id: input.taskId,
    schedule_id: input.scheduleId,
    scheduled_for: input.scheduledForISO,
    completed_at: input.status === "done" ? nowISO : null,
    status: input.status,
    note: input.note ?? null,
    recorded_by: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("task_logs")
        .select("status, completed_at, recorded_by")
        .eq("task_id", input.taskId)
        .eq("scheduled_for", input.scheduledForISO)
        .maybeSingle();
      let recordedByName: string | null = null;
      if (existing?.recorded_by) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", existing.recorded_by)
          .maybeSingle();
        recordedByName = prof?.full_name ?? null;
      }
      return {
        ok: false,
        conflict: true,
        recordedByName,
        completedAt: existing?.completed_at ?? null,
        status: (existing?.status as TaskStatus) ?? input.status,
      };
    }
    return { ok: false, conflict: false, message: "No se pudo registrar." };
  }

  revalidatePath("/tareas");
  revalidatePath("/");
  return { ok: true };
}

/** Crea una tarea recurrente con sus horas (admin). */
export async function createTask(input: {
  title: string;
  description: string | null;
  category: string | null;
  times: string[];
  daysOfWeek: number[] | null;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireRole("admin");
  const patient = await getActivePatient();
  if (!patient) return { ok: false, message: "No hay paciente activo." };
  const supabase = await createClient();

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      patient_id: patient.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !task) return { ok: false, message: "No se pudo crear la tarea." };

  const rows: TablesInsert<"task_schedules">[] = input.times
    .filter(Boolean)
    .map((t) => ({
      task_id: task.id,
      time_of_day: t,
      days_of_week: input.daysOfWeek,
    }));
  if (rows.length === 0) return { ok: false, message: "Añade al menos una hora." };

  const { error: schedErr } = await supabase.from("task_schedules").insert(rows);
  if (schedErr) return { ok: false, message: "No se pudo crear el horario." };

  revalidatePath("/tareas");
  revalidatePath("/");
  return { ok: true };
}
