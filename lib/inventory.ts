import { createClient } from "@/lib/supabase/server";

export type StockInfo = {
  /** Unidades restantes (nunca por debajo de 0 en la práctica). */
  remaining: number;
  unitsPerDose: number;
  label: string | null;
  lowThreshold: number | null;
  isLow: boolean;
  /** Dosis completas restantes con el saldo actual. */
  dosesLeft: number;
};

/**
 * Saldo derivado de inventario para un conjunto de medicamentos con
 * seguimiento activo.
 *
 *   restante = Σ(reabastecimientos) − (dosis administradas × unidades_por_dosis)
 *
 * Se cuentan solo las dosis con estado "given" ocurridas a partir del primer
 * reabastecimiento (ese es el punto de partida del conteo).
 */
export async function loadStockFor(
  meds: {
    id: string;
    track_stock: boolean;
    units_per_dose: number;
    stock_unit_label: string | null;
    low_stock_threshold: number | null;
  }[],
): Promise<Map<string, StockInfo>> {
  const tracked = meds.filter((m) => m.track_stock);
  const result = new Map<string, StockInfo>();
  if (tracked.length === 0) return result;

  const supabase = await createClient();
  const ids = tracked.map((m) => m.id);

  const [{ data: restocks }, { data: given }] = await Promise.all([
    supabase
      .from("medication_restocks")
      .select("patient_medication_id, units, created_at")
      .in("patient_medication_id", ids),
    supabase
      .from("medication_logs")
      .select("patient_medication_id, created_at")
      .in("patient_medication_id", ids)
      .eq("status", "given"),
  ]);

  // Suma de unidades y primer reabastecimiento por medicamento.
  const added = new Map<string, number>();
  const firstRestock = new Map<string, number>();
  for (const r of restocks ?? []) {
    added.set(
      r.patient_medication_id,
      (added.get(r.patient_medication_id) ?? 0) + Number(r.units),
    );
    const t = new Date(r.created_at).getTime();
    const cur = firstRestock.get(r.patient_medication_id);
    if (cur === undefined || t < cur) firstRestock.set(r.patient_medication_id, t);
  }

  // Dosis administradas desde el primer reabastecimiento.
  const dosesGiven = new Map<string, number>();
  for (const g of given ?? []) {
    const start = firstRestock.get(g.patient_medication_id);
    if (start === undefined) continue;
    if (new Date(g.created_at).getTime() < start) continue;
    dosesGiven.set(
      g.patient_medication_id,
      (dosesGiven.get(g.patient_medication_id) ?? 0) + 1,
    );
  }

  for (const m of tracked) {
    const perDose = Number(m.units_per_dose) || 1;
    const consumed = (dosesGiven.get(m.id) ?? 0) * perDose;
    const remaining = Math.max(0, (added.get(m.id) ?? 0) - consumed);
    const lowThreshold =
      m.low_stock_threshold != null ? Number(m.low_stock_threshold) : null;
    result.set(m.id, {
      remaining,
      unitsPerDose: perDose,
      label: m.stock_unit_label,
      lowThreshold,
      isLow: lowThreshold != null && remaining <= lowThreshold,
      dosesLeft: Math.floor(remaining / perDose),
    });
  }

  return result;
}
