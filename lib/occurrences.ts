import { getISODay } from "date-fns";
import { scheduledForUtc, toAppTz, todayInAppTz } from "@/lib/time";
import type { OccurrenceState } from "@/lib/status";

/**
 * Motor de ocurrencias (spec 3.3). Todo es función pura: recibe reglas + logs +
 * "ahora" y deriva las ocurrencias del día y su estado. No toca la base de datos.
 *
 * Convención de días de la semana: ISO 1=lunes … 7=domingo.
 */

export type MedScheduleRow = {
  id: string;
  patient_medication_id: string;
  schedule_type: "fixed" | "interval" | "prn";
  time_of_day: string | null;
  days_of_week: number[] | null;
  interval_hours: number | null;
  anchor_time: string | null;
};

export type MedInfo = {
  id: string;
  name: string;
  dose: number | null;
  unit: string | null;
  instructions: string | null;
  prn_reason: string | null;
  prn_min_hours_between: number | null;
};

export type MedLogRow = {
  id: string;
  patient_medication_id: string;
  schedule_id: string | null;
  scheduled_for: string | null;
  administered_at: string | null;
  status: "given" | "skipped" | "postponed";
  postponed_to: string | null;
  note: string | null;
  recorded_by: string;
};

export type MedOccurrence = {
  medicationId: string;
  scheduleId: string;
  name: string;
  dose: number | null;
  unit: string | null;
  instructions: string | null;
  scheduledFor: Date;
  state: OccurrenceState;
  log: MedLogRow | null;
};

export type PrnMedication = {
  medication: MedInfo;
  scheduleId: string;
  lastDose: MedLogRow | null;
  dosesToday: number;
};

const HOUR_MS = 60 * 60 * 1000;

/** Día ISO de la semana (1-7) del día calendario AST. */
function weekdayIso(day: string): number {
  return getISODay(toAppTz(scheduledForUtc(day, "12:00")));
}

/** Instante de una hora fija si aplica al día (según days_of_week). */
function fixedTimeFor(
  timeOfDay: string | null,
  daysOfWeek: number[] | null,
  day: string,
): Date[] {
  if (!timeOfDay) return [];
  if (daysOfWeek && !daysOfWeek.includes(weekdayIso(day))) return [];
  return [scheduledForUtc(day, timeOfDay)];
}

/**
 * Instantes de una regla de intervalo en el día. Se recalcula desde anchor_time
 * cada día (no desde la última dosis) para no acumular drift (spec 3.2).
 */
function intervalTimes(schedule: MedScheduleRow, day: string): Date[] {
  if (!schedule.anchor_time || !schedule.interval_hours) return [];
  const base = scheduledForUtc(day, schedule.anchor_time);
  const times: Date[] = [];
  for (let k = 0; k < 24; k++) {
    const t = new Date(base.getTime() + k * schedule.interval_hours * HOUR_MS);
    // Solo dentro del mismo día calendario AST (PR no tiene DST).
    if (todayInAppTz(t) !== day) break;
    times.push(t);
  }
  return times;
}

function deriveState(
  scheduledFor: Date,
  log: MedLogRow | null,
  now: Date,
  graceMinutes: number,
): OccurrenceState {
  if (log) return log.status; // 'given' | 'skipped' | 'postponed'
  if (now.getTime() < scheduledFor.getTime()) return "pending";
  if (now.getTime() <= scheduledFor.getTime() + graceMinutes * 60 * 1000) {
    return "due";
  }
  return "late";
}

/** Clave de emparejamiento ocurrencia↔log: medicamento + instante exacto. */
function matchKey(medicationId: string, instant: Date): string {
  return `${medicationId}|${instant.getTime()}`;
}

/**
 * Deriva las ocurrencias de medicamentos (fixed + interval) del día, empareja
 * cada una con su log si existe, y separa los PRN.
 */
export function buildMedOccurrences(params: {
  day: string;
  now: Date;
  graceMinutes: number;
  medications: MedInfo[];
  schedules: MedScheduleRow[];
  logs: MedLogRow[];
}): { occurrences: MedOccurrence[]; prn: PrnMedication[] } {
  const { day, now, graceMinutes, medications, schedules, logs } = params;

  const medById = new Map(medications.map((m) => [m.id, m]));

  // Logs con hora programada, indexados por (medicamento, instante).
  const scheduledLogs = new Map<string, MedLogRow>();
  for (const log of logs) {
    if (log.scheduled_for) {
      scheduledLogs.set(
        matchKey(log.patient_medication_id, new Date(log.scheduled_for)),
        log,
      );
    }
  }

  const occurrences: MedOccurrence[] = [];
  const prn: PrnMedication[] = [];

  for (const schedule of schedules) {
    const med = medById.get(schedule.patient_medication_id);
    if (!med) continue;

    if (schedule.schedule_type === "prn") {
      const prnLogs = logs
        .filter(
          (l) => l.patient_medication_id === med.id && l.scheduled_for === null,
        )
        .sort(
          (a, b) =>
            new Date(b.administered_at ?? 0).getTime() -
            new Date(a.administered_at ?? 0).getTime(),
        );
      prn.push({
        medication: med,
        scheduleId: schedule.id,
        lastDose: prnLogs[0] ?? null,
        dosesToday: prnLogs.length,
      });
      continue;
    }

    const times =
      schedule.schedule_type === "fixed"
        ? fixedTimeFor(schedule.time_of_day, schedule.days_of_week, day)
        : intervalTimes(schedule, day);

    for (const scheduledFor of times) {
      const log = scheduledLogs.get(matchKey(med.id, scheduledFor)) ?? null;
      occurrences.push({
        medicationId: med.id,
        scheduleId: schedule.id,
        name: med.name,
        dose: med.dose,
        unit: med.unit,
        instructions: med.instructions,
        scheduledFor,
        state: deriveState(scheduledFor, log, now, graceMinutes),
        log,
      });
    }
  }

  occurrences.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  prn.sort((a, b) => a.medication.name.localeCompare(b.medication.name));
  return { occurrences, prn };
}

// ── Tareas (mismo patrón; solo horas fijas; estado done/skipped) ─────────────

export type TaskScheduleRow = {
  id: string;
  task_id: string;
  time_of_day: string;
  days_of_week: number[] | null;
};

export type TaskInfo = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
};

export type TaskLogRow = {
  id: string;
  task_id: string;
  schedule_id: string | null;
  scheduled_for: string | null;
  completed_at: string | null;
  status: "done" | "skipped";
  note: string | null;
  recorded_by: string;
};

export type TaskOccurrence = {
  taskId: string;
  scheduleId: string;
  title: string;
  category: string | null;
  scheduledFor: Date;
  state: OccurrenceState;
  log: TaskLogRow | null;
};

/** El estado 'done' de una tarea se mapea a 'given' (verde) del sistema común. */
function deriveTaskState(
  scheduledFor: Date,
  log: TaskLogRow | null,
  now: Date,
  graceMinutes: number,
): OccurrenceState {
  if (log) return log.status === "done" ? "given" : "skipped";
  if (now.getTime() < scheduledFor.getTime()) return "pending";
  if (now.getTime() <= scheduledFor.getTime() + graceMinutes * 60 * 1000) {
    return "due";
  }
  return "late";
}

export function buildTaskOccurrences(params: {
  day: string;
  now: Date;
  graceMinutes: number;
  tasks: TaskInfo[];
  schedules: TaskScheduleRow[];
  logs: TaskLogRow[];
}): TaskOccurrence[] {
  const { day, now, graceMinutes, tasks, schedules, logs } = params;
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  const scheduledLogs = new Map<string, TaskLogRow>();
  for (const log of logs) {
    if (log.scheduled_for) {
      scheduledLogs.set(
        `${log.task_id}|${new Date(log.scheduled_for).getTime()}`,
        log,
      );
    }
  }

  const occurrences: TaskOccurrence[] = [];
  for (const schedule of schedules) {
    const task = taskById.get(schedule.task_id);
    if (!task) continue;
    const times = fixedTimeFor(schedule.time_of_day, schedule.days_of_week, day);
    for (const scheduledFor of times) {
      const log =
        scheduledLogs.get(`${task.id}|${scheduledFor.getTime()}`) ?? null;
      occurrences.push({
        taskId: task.id,
        scheduleId: schedule.id,
        title: task.title,
        category: task.category,
        scheduledFor,
        state: deriveTaskState(scheduledFor, log, now, graceMinutes),
        log,
      });
    }
  }
  occurrences.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  return occurrences;
}

/** Una ocurrencia está "pendiente" (aún accionable) si no tiene log resuelto. */
export function isPending(state: OccurrenceState): boolean {
  return state === "pending" || state === "due" || state === "late";
}

/** Acción inmediata: toca ahora o atrasado. */
export function isActionableNow(state: OccurrenceState): boolean {
  return state === "due" || state === "late";
}
