/**
 * Sistema de estado único y centralizado (spec 3.4 y 6).
 * Cualquier color de estado de la UI sale de aquí. No hardcodear colores fuera.
 */

export type OccurrenceState =
  | "pending" // sin log, hora futura
  | "due" // sin log, dentro de ventana ("toca ahora")
  | "late" // sin log, pasó ventana de gracia
  | "given" // log = dado / done
  | "skipped" // log = omitido
  | "postponed"; // log = pospuesto

export type StatusColor = "done" | "pending" | "late" | "inactive";

const STATE_TO_COLOR: Record<OccurrenceState, StatusColor> = {
  pending: "pending",
  due: "pending",
  late: "late",
  given: "done",
  skipped: "late",
  postponed: "pending",
};

const STATE_LABEL: Record<OccurrenceState, string> = {
  pending: "Pendiente",
  due: "Toca ahora",
  late: "Atrasado",
  given: "Dado",
  skipped: "Omitido",
  postponed: "Pospuesto",
};

/** Clases Tailwind (fondo suave + texto + borde) por color de estado. */
const COLOR_CLASSES: Record<StatusColor, string> = {
  done: "bg-green-50 text-status-done border-status-done/30",
  pending: "bg-amber-50 text-status-pending border-status-pending/30",
  late: "bg-red-50 text-status-late border-status-late/30",
  inactive: "bg-black/5 text-status-inactive border-status-inactive/30",
};

/** Lomo de color a la izquierda de una tarjeta según estado (elemento firma). */
const ACCENT_CLASSES: Record<StatusColor, string> = {
  done: "border-l-[6px] border-l-status-done",
  pending: "border-l-[6px] border-l-status-pending",
  late: "border-l-[6px] border-l-status-late",
  inactive: "border-l-[6px] border-l-status-inactive",
};

export function accentClasses(color: StatusColor): string {
  return ACCENT_CLASSES[color];
}

export function stateColor(state: OccurrenceState): StatusColor {
  return STATE_TO_COLOR[state];
}

export function stateLabel(state: OccurrenceState): string {
  return STATE_LABEL[state];
}

export function stateClasses(state: OccurrenceState): string {
  return COLOR_CLASSES[STATE_TO_COLOR[state]];
}

export function colorClasses(color: StatusColor): string {
  return COLOR_CLASSES[color];
}
