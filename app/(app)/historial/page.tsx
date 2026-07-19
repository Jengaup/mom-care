import { getActivePatient } from "@/lib/patient";
import { createClient } from "@/lib/supabase/server";
import { dayRangeUtc, formatApp } from "@/lib/time";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import type { OccurrenceState } from "@/lib/status";
import type { Enums } from "@/types/database";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const MED_STATE: Record<string, OccurrenceState> = {
  given: "given",
  skipped: "skipped",
  postponed: "postponed",
};
const TASK_STATE: Record<string, OccurrenceState> = {
  done: "given",
  skipped: "skipped",
};

type SP = Record<string, string | undefined>;

const selectCls =
  "min-h-touch w-full rounded-xl border border-gray-300 px-3 text-base bg-white";

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const patient = await getActivePatient();
  if (!patient) {
    return <EmptyState title="No hay un paciente asignado a tu cuenta." />;
  }
  const sp = await searchParams;
  const tipo = sp.tipo === "task" ? "task" : "med";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  // Opciones de filtro.
  const [{ data: meds }, { data: tasks }, { data: links }] = await Promise.all([
    supabase
      .from("patient_medications")
      .select("id, name")
      .eq("patient_id", patient.id)
      .order("name"),
    supabase
      .from("tasks")
      .select("id, title")
      .eq("patient_id", patient.id)
      .order("title"),
    supabase
      .from("caregiver_patients")
      .select("profile_id")
      .eq("patient_id", patient.id),
  ]);
  const medName = new Map((meds ?? []).map((m) => [m.id, m.name]));
  const taskName = new Map((tasks ?? []).map((t) => [t.id, t.title]));

  const caregiverIds = (links ?? []).map((l) => l.profile_id);
  const caregiverName = new Map<string, string>();
  if (caregiverIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", caregiverIds);
    for (const p of profs ?? []) caregiverName.set(p.id, p.full_name ?? "—");
  }

  const dateStart = sp.from ? dayRangeUtc(sp.from).start.toISOString() : null;
  const dateEnd = sp.to ? dayRangeUtc(sp.to).end.toISOString() : null;

  type Row = {
    id: string;
    label: string;
    status: string;
    state: OccurrenceState;
    when: string;
    who: string;
  };
  let rows: Row[] = [];
  let total = 0;

  if (tipo === "med") {
    const medIds = (meds ?? []).map((m) => m.id);
    if (medIds.length > 0) {
      let q = supabase
        .from("medication_logs")
        .select(
          "id, patient_medication_id, status, administered_at, scheduled_for, created_at, recorded_by",
          { count: "exact" },
        )
        .in("patient_medication_id", medIds)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (sp.med) q = q.eq("patient_medication_id", sp.med);
      if (sp.estado && MED_STATE[sp.estado])
        q = q.eq("status", sp.estado as Enums<"med_log_status">);
      if (sp.caregiver) q = q.eq("recorded_by", sp.caregiver);
      if (dateStart) q = q.gte("created_at", dateStart);
      if (dateEnd) q = q.lt("created_at", dateEnd);
      const { data, count } = await q;
      total = count ?? 0;
      rows = (data ?? []).map((l) => ({
        id: l.id,
        label: medName.get(l.patient_medication_id) ?? "Medicamento",
        status: l.status,
        state: MED_STATE[l.status] ?? "pending",
        when: formatApp(
          l.administered_at ?? l.scheduled_for ?? l.created_at,
          "d MMM, h:mm a",
        ),
        who: l.recorded_by ? caregiverName.get(l.recorded_by) ?? "—" : "—",
      }));
    }
  } else {
    const taskIds = (tasks ?? []).map((t) => t.id);
    if (taskIds.length > 0) {
      let q = supabase
        .from("task_logs")
        .select(
          "id, task_id, status, completed_at, scheduled_for, created_at, recorded_by",
          { count: "exact" },
        )
        .in("task_id", taskIds)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (sp.task) q = q.eq("task_id", sp.task);
      if (sp.estado && TASK_STATE[sp.estado])
        q = q.eq("status", sp.estado as Enums<"task_log_status">);
      if (sp.caregiver) q = q.eq("recorded_by", sp.caregiver);
      if (dateStart) q = q.gte("created_at", dateStart);
      if (dateEnd) q = q.lt("created_at", dateEnd);
      const { data, count } = await q;
      total = count ?? 0;
      rows = (data ?? []).map((l) => ({
        id: l.id,
        label: taskName.get(l.task_id) ?? "Tarea",
        status: l.status,
        state: TASK_STATE[l.status] ?? "pending",
        when: formatApp(
          l.completed_at ?? l.scheduled_for ?? l.created_at,
          "d MMM, h:mm a",
        ),
        who: l.recorded_by ? caregiverName.get(l.recorded_by) ?? "—" : "—",
      }));
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v) params.set(k, v);
    params.set("page", String(p));
    return `/historial?${params.toString()}`;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Historial</h1>

      <form method="get" className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select name="tipo" defaultValue={tipo} className={selectCls}>
            <option value="med">Medicamentos</option>
            <option value="task">Tareas</option>
          </select>
          <select name="estado" defaultValue={sp.estado ?? ""} className={selectCls}>
            <option value="">Todos los estados</option>
            {tipo === "med" ? (
              <>
                <option value="given">Dado</option>
                <option value="skipped">Omitido</option>
                <option value="postponed">Pospuesto</option>
              </>
            ) : (
              <>
                <option value="done">Hecho</option>
                <option value="skipped">Omitido</option>
              </>
            )}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {tipo === "med" ? (
            <select name="med" defaultValue={sp.med ?? ""} className={selectCls}>
              <option value="">Todos los medicamentos</option>
              {(meds ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          ) : (
            <select name="task" defaultValue={sp.task ?? ""} className={selectCls}>
              <option value="">Todas las tareas</option>
              {(tasks ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
          <select
            name="caregiver"
            defaultValue={sp.caregiver ?? ""}
            className={selectCls}
          >
            <option value="">Todos los cuidadores</option>
            {Array.from(caregiverName.entries()).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            name="from"
            defaultValue={sp.from ?? ""}
            className={selectCls}
          />
          <input
            type="date"
            name="to"
            defaultValue={sp.to ?? ""}
            className={selectCls}
          />
        </div>
        <button
          type="submit"
          className="min-h-touch w-full rounded-xl bg-status-done font-semibold text-white"
        >
          Filtrar
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="No hay registros con estos filtros" />
      ) : (
        <Card className="divide-y divide-gray-100 p-0">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="truncate text-base text-gray-900">{r.label}</p>
                <p className="text-sm text-gray-500">
                  {r.when} · {r.who}
                </p>
              </div>
              <StatusBadge state={r.state} label={r.state === "given" && tipo === "task" ? "Hecho" : undefined} />
            </div>
          ))}
        </Card>
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between">
          {page > 1 ? (
            <a href={pageHref(page - 1)} className="text-status-done">
              ‹ Anterior
            </a>
          ) : (
            <span />
          )}
          <span className="text-sm text-gray-500">
            Página {page} de {totalPages}
          </span>
          {page < totalPages ? (
            <a href={pageHref(page + 1)} className="text-status-done">
              Siguiente ›
            </a>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
