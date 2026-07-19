import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * Zona horaria única de la app. Puerto Rico (AST) no observa horario de verano,
 * así que no hay saltos de DST que compliquen el cálculo de ocurrencias.
 */
export const APP_TIMEZONE = "America/Puerto_Rico";

/** Instante actual. Aislado en un helper para no esparcir `new Date()` por el código. */
export function now(): Date {
  return new Date();
}

/** Fecha calendario de hoy en AST, como string `yyyy-MM-dd`. */
export function todayInAppTz(reference: Date = now()): string {
  return formatInTimeZone(reference, APP_TIMEZONE, "yyyy-MM-dd");
}

/**
 * Rango [inicio, fin) del día calendario `dateStr` (yyyy-MM-dd) en AST, en UTC.
 * Útil para filtrar `timestamptz` por "hoy" en la base de datos.
 */
export function dayRangeUtc(dateStr: string): { start: Date; end: Date } {
  const start = fromZonedTime(`${dateStr}T00:00:00`, APP_TIMEZONE);
  const end = fromZonedTime(`${dateStr}T00:00:00`, APP_TIMEZONE);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/**
 * Combina un día calendario AST (yyyy-MM-dd) con una hora local (HH:mm o HH:mm:ss)
 * y devuelve el instante UTC exacto. Esta es LA función que fija `scheduled_for`;
 * render e insert deben usarla para que las ocurrencias emparejen con los logs.
 */
export function scheduledForUtc(dateStr: string, timeOfDay: string): Date {
  const hhmmss = timeOfDay.length === 5 ? `${timeOfDay}:00` : timeOfDay;
  return fromZonedTime(`${dateStr}T${hhmmss}`, APP_TIMEZONE);
}

/** Convierte un instante UTC a la hora de pared en AST. */
export function toAppTz(date: Date): Date {
  return toZonedTime(date, APP_TIMEZONE);
}

/** Formatea un instante en AST. Patrón de date-fns (ej. "h:mm a", "d MMM yyyy"). */
export function formatApp(date: Date | string, pattern: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, APP_TIMEZONE, pattern);
}

/** Hora corta legible, ej. "8:02 AM". */
export function formatTime(date: Date | string): string {
  return formatApp(date, "h:mm a");
}
