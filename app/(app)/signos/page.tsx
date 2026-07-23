import { getActivePatient } from "@/lib/patient";
import { createClient } from "@/lib/supabase/server";
import { formatApp } from "@/lib/time";
import { OBS_CONFIG, formatObsValue, type ObsType } from "@/lib/observations";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecordObservation } from "@/components/observations/RecordObservation";

export const dynamic = "force-dynamic";

export default async function SignosPage() {
  const patient = await getActivePatient();
  if (!patient) return <EmptyState title="No hay un paciente activo." />;
  const supabase = await createClient();

  const { data: obs } = await supabase
    .from("observations")
    .select("id, type, value_num, value_text, unit, note, measured_at, recorded_by")
    .eq("patient_id", patient.id)
    .order("measured_at", { ascending: false })
    .limit(50);
  const list = obs ?? [];

  const ids = Array.from(new Set(list.map((o) => o.recorded_by)));
  const nameById = new Map<string, string>();
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    for (const p of profs ?? []) nameById.set(p.id, p.full_name ?? "—");
  }

  // Agrupar por día (AST)
  const byDay = new Map<string, typeof list>();
  for (const o of list) {
    const day = formatApp(o.measured_at, "EEEE d 'de' MMMM");
    const arr = byDay.get(day) ?? [];
    arr.push(o);
    byDay.set(day, arr);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold text-ink">Signos</h1>
      <RecordObservation />

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-bold uppercase tracking-wide text-muted">
          Recientes
        </h2>
        {list.length === 0 ? (
          <EmptyState title="Aún no hay signos registrados" />
        ) : (
          Array.from(byDay.entries()).map(([day, items]) => (
            <div key={day} className="space-y-2">
              <p className="px-1 text-sm font-semibold text-ink/70">{day}</p>
              <Card className="divide-y divide-line p-0">
                {items.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between gap-2 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-base text-ink">
                        <span className="font-semibold">
                          {OBS_CONFIG[o.type as ObsType].label}:
                        </span>{" "}
                        {formatObsValue(
                          o.type as ObsType,
                          o.value_num,
                          o.value_text,
                          o.unit,
                        )}
                      </p>
                      <p className="text-sm text-muted">
                        {formatApp(o.measured_at, "h:mm a")} ·{" "}
                        {nameById.get(o.recorded_by) ?? "—"}
                        {o.note ? ` · ${o.note}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
