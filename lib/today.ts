import { createClient } from "@/lib/supabase/server";
import { dayRangeUtc, now, todayInAppTz } from "@/lib/time";
import {
  buildMedOccurrences,
  buildTaskOccurrences,
  type MedInfo,
  type MedLogRow,
  type MedOccurrence,
  type MedScheduleRow,
  type PrnMedication,
  type TaskInfo,
  type TaskLogRow,
  type TaskOccurrence,
  type TaskScheduleRow,
} from "@/lib/occurrences";
import type { Patient } from "@/lib/patient";

/** Carga y deriva las ocurrencias de medicamentos de hoy para el paciente. */
export async function loadMedicationToday(patient: Patient): Promise<{
  day: string;
  occurrences: MedOccurrence[];
  prn: PrnMedication[];
}> {
  const supabase = await createClient();
  const day = todayInAppTz();
  const { start, end } = dayRangeUtc(day);

  const { data: meds } = await supabase
    .from("patient_medications")
    .select(
      "id, name, dose, unit, instructions, prn_reason, prn_min_hours_between",
    )
    .eq("patient_id", patient.id)
    .eq("is_active", true);

  const medications: MedInfo[] = meds ?? [];
  const medIds = medications.map((m) => m.id);
  if (medIds.length === 0) {
    return { day, occurrences: [], prn: [] };
  }

  const { data: sch } = await supabase
    .from("medication_schedules")
    .select(
      "id, patient_medication_id, schedule_type, time_of_day, days_of_week, interval_hours, anchor_time",
    )
    .in("patient_medication_id", medIds)
    .eq("is_active", true);
  const schedules: MedScheduleRow[] = sch ?? [];

  const { data: lg } = await supabase
    .from("medication_logs")
    .select(
      "id, patient_medication_id, schedule_id, scheduled_for, administered_at, status, postponed_to, note, recorded_by",
    )
    .in("patient_medication_id", medIds)
    .or(
      `and(scheduled_for.gte.${start.toISOString()},scheduled_for.lt.${end.toISOString()}),and(scheduled_for.is.null,administered_at.gte.${start.toISOString()},administered_at.lt.${end.toISOString()})`,
    );
  const logs: MedLogRow[] = lg ?? [];

  return {
    day,
    ...buildMedOccurrences({
      day,
      now: now(),
      graceMinutes: patient.grace_minutes,
      medications,
      schedules,
      logs,
    }),
  };
}

/** Carga y deriva las ocurrencias de tareas de hoy para el paciente. */
export async function loadTaskToday(patient: Patient): Promise<{
  day: string;
  occurrences: TaskOccurrence[];
}> {
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
  if (taskIds.length === 0) {
    return { day, occurrences: [] };
  }

  const { data: sch } = await supabase
    .from("task_schedules")
    .select("id, task_id, time_of_day, days_of_week")
    .in("task_id", taskIds)
    .eq("is_active", true);
  const schedules: TaskScheduleRow[] = sch ?? [];

  const { data: lg } = await supabase
    .from("task_logs")
    .select(
      "id, task_id, schedule_id, scheduled_for, completed_at, status, note, recorded_by",
    )
    .in("task_id", taskIds)
    .gte("scheduled_for", start.toISOString())
    .lt("scheduled_for", end.toISOString());
  const logs: TaskLogRow[] = lg ?? [];

  return {
    day,
    occurrences: buildTaskOccurrences({
      day,
      now: now(),
      graceMinutes: patient.grace_minutes,
      tasks,
      schedules,
      logs,
    }),
  };
}
