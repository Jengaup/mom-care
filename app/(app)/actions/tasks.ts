"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

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
