"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import type { TablesInsert } from "@/types/database";

export type TaskStatus = "done" | "skipped";

export type RecordTaskResult =
  | { ok: true; logId: string | null }
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

  const { data: inserted, error } = await supabase
    .from("task_logs")
    .insert({
      task_id: input.taskId,
      schedule_id: input.scheduleId,
      scheduled_for: input.scheduledForISO,
      completed_at: input.status === "done" ? nowISO : null,
      status: input.status,
      note: input.note ?? null,
      recorded_by: user.id,
    })
    .select("id")
    .single();

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
  return { ok: true, logId: inserted?.id ?? null };
}

/** Deshace un registro reciente de tarea (solo quien lo registró, ventana de
 * 10 min impuesta por RLS). */
export async function undoTaskLog(
  logId: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_logs")
    .delete()
    .eq("id", logId)
    .select("id");
  if (error) return { ok: false, message: "No se pudo deshacer." };
  if (!data || data.length === 0) {
    return { ok: false, message: "Ya no se puede deshacer." };
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

/** Edita una tarea (admin): datos + reemplaza sus horarios. */
export async function updateTask(input: {
  taskId: string;
  title: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  times: string[];
  daysOfWeek: number[] | null;
}): Promise<{ ok: boolean; message?: string }> {
  await requireRole("admin");
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      is_active: input.isActive,
    })
    .eq("id", input.taskId);
  if (error) return { ok: false, message: "No se pudo actualizar la tarea." };

  await supabase
    .from("task_schedules")
    .update({ is_active: false })
    .eq("task_id", input.taskId);

  const rows: TablesInsert<"task_schedules">[] = input.times
    .filter(Boolean)
    .map((t) => ({ task_id: input.taskId, time_of_day: t, days_of_week: input.daysOfWeek }));
  if (rows.length === 0) return { ok: false, message: "Añade al menos una hora." };
  const { error: schedErr } = await supabase.from("task_schedules").insert(rows);
  if (schedErr) return { ok: false, message: "No se pudo guardar el horario." };

  revalidatePath("/tareas");
  revalidatePath("/tareas/gestionar");
  revalidatePath("/");
  return { ok: true };
}

/** Activa o desactiva una tarea (admin). */
export async function setTaskActive(
  taskId: string,
  active: boolean,
): Promise<{ ok: boolean }> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ is_active: active })
    .eq("id", taskId);
  if (error) return { ok: false };
  revalidatePath("/tareas");
  revalidatePath("/tareas/gestionar");
  revalidatePath("/");
  return { ok: true };
}

/** Corrige el estado de un registro de tarea (solo admin). */
export async function correctTaskLog(
  logId: string,
  newStatus: TaskStatus,
): Promise<{ ok: boolean; message?: string }> {
  const user = await requireRole("admin");
  const supabase = await createClient();
  const { data: cur } = await supabase
    .from("task_logs")
    .select("status")
    .eq("id", logId)
    .maybeSingle();
  if (!cur) return { ok: false, message: "Registro no encontrado." };

  const { error } = await supabase
    .from("task_logs")
    .update({
      status: newStatus,
      completed_at: newStatus === "done" ? new Date().toISOString() : null,
      previous_status: cur.status,
      corrected_by: user.id,
      corrected_at: new Date().toISOString(),
    })
    .eq("id", logId);
  if (error) return { ok: false, message: "No se pudo corregir." };
  revalidatePath("/historial");
  revalidatePath("/tareas");
  revalidatePath("/");
  return { ok: true };
}
