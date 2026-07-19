import { formatApp } from "@/lib/time";
import type { MedOccurrence, PrnMedication, TaskOccurrence } from "@/lib/occurrences";
import type {
  OccDTO,
  OccGroup,
  PrnDTO,
} from "@/components/medications/MedicationList";
import type { TaskDTO, TaskGroup } from "@/components/tasks/TaskList";

/** Agrupa ocurrencias de medicamentos por hora (AST), en orden cronológico. */
export function groupMedOccurrences(occurrences: MedOccurrence[]): OccGroup[] {
  const map = new Map<string, OccDTO[]>();
  for (const o of occurrences) {
    const timeLabel = formatApp(o.scheduledFor, "h:mm a");
    const dto: OccDTO = {
      key: `${o.medicationId}|${o.scheduledFor.toISOString()}`,
      medicationId: o.medicationId,
      scheduleId: o.scheduleId,
      name: o.name,
      dose: o.dose,
      unit: o.unit,
      instructions: o.instructions,
      scheduledForISO: o.scheduledFor.toISOString(),
      timeLabel,
      state: o.state,
      recordedByName: null,
    };
    const arr = map.get(timeLabel);
    if (arr) arr.push(dto);
    else map.set(timeLabel, [dto]);
  }
  return Array.from(map.entries()).map(([timeLabel, items]) => ({
    timeLabel,
    items,
  }));
}

export function toPrnDtos(prn: PrnMedication[]): PrnDTO[] {
  return prn.map((p) => ({
    medicationId: p.medication.id,
    scheduleId: p.scheduleId,
    name: p.medication.name,
    dose: p.medication.dose,
    unit: p.medication.unit,
    reason: p.medication.prn_reason,
    minHours: p.medication.prn_min_hours_between,
    lastDoseISO: p.lastDose?.administered_at ?? null,
    dosesToday: p.dosesToday,
  }));
}

/** Agrupa ocurrencias de tareas por hora (AST), en orden cronológico. */
export function groupTaskOccurrences(occurrences: TaskOccurrence[]): TaskGroup[] {
  const map = new Map<string, TaskDTO[]>();
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
    const arr = map.get(timeLabel);
    if (arr) arr.push(dto);
    else map.set(timeLabel, [dto]);
  }
  return Array.from(map.entries()).map(([timeLabel, items]) => ({
    timeLabel,
    items,
  }));
}
