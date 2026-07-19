import type { Enums } from "@/types/database";
import { formatTime } from "@/lib/time";

type ActivityAction = Enums<"activity_action">;

/**
 * Compone el texto legible del feed desde action + metadata (spec 3.8).
 * No se guardan strings pre-formateados: se arman aquí en el front.
 */
export function describeActivity(
  action: ActivityAction,
  metadata: Record<string, unknown>,
  actorName: string | null,
): string {
  const who = actorName ?? "Alguien";
  const med = (metadata.med_name as string) ?? "un medicamento";
  const dose = metadata.dose != null ? ` ${metadata.dose}` : "";
  const unit = metadata.unit ? `${metadata.unit}` : "";
  const doseStr = dose ? `${dose}${unit ? " " + unit : ""}` : "";
  const task = (metadata.task_title as string) ?? "una tarea";
  const title = (metadata.title as string) ?? "una cita";
  const at = metadata.administered_at
    ? ` a las ${formatTime(metadata.administered_at as string)}`
    : "";

  switch (action) {
    case "med_given":
      return `${who} registró ${med}${doseStr}${at}`;
    case "med_skipped":
      return `${who} omitió ${med}`;
    case "med_postponed":
      return `${who} pospuso ${med}`;
    case "med_corrected":
      return `${who} corrigió ${med}`;
    case "task_done":
      return `${who} completó "${task}"`;
    case "task_skipped":
      return `${who} omitió "${task}"`;
    case "appt_created":
      return `${who} creó la cita "${title}"`;
    case "appt_completed":
      return `${who} completó la cita "${title}"`;
    case "appt_cancelled":
      return `${who} canceló la cita "${title}"`;
    case "appt_rescheduled":
      return `${who} reprogramó la cita "${title}"`;
    case "note_added":
      return `${who} añadió una nota del día`;
    case "note_updated":
      return `${who} actualizó una nota del día`;
    default:
      return `${who} hizo una acción`;
  }
}
