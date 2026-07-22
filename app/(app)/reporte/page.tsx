import { differenceInYears, subDays } from "date-fns";
import { getActivePatient } from "@/lib/patient";
import { createClient } from "@/lib/supabase/server";
import { dayRangeUtc, formatApp, todayInAppTz } from "@/lib/time";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrintButton } from "@/components/report/PrintButton";

export const dynamic = "force-dynamic";

const MED_STATUS: Record<string, string> = {
  given: "Dado",
  skipped: "Omitido",
  postponed: "Pospuesto",
};
const TASK_STATUS: Record<string, string> = { done: "Hecho", skipped: "Omitido" };
const APPT_STATUS: Record<string, string> = {
  upcoming: "Próxima",
  completed: "Completada",
  cancelled: "Cancelada",
  rescheduled: "Reprogramada",
};

type SP = Record<string, string | undefined>;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 border-b border-gray-300 pb-1 text-lg font-bold text-gray-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function ReportePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const patient = await getActivePatient();
  if (!patient) {
    return <EmptyState title="No hay un paciente activo." />;
  }
  const sp = await searchParams;
  const today = todayInAppTz();
  const toStr = sp.to || today;
  const fromStr =
    sp.from ||
    formatApp(subDays(new Date(`${today}T12:00:00-04:00`), 29), "yyyy-MM-dd");

  const start = dayRangeUtc(fromStr).start.toISOString();
  const end = dayRangeUtc(toStr).end.toISOString();

  const supabase = await createClient();

  const { data: meds } = await supabase
    .from("patient_medications")
    .select("id, name, dose, unit, instructions, prn_reason, is_active")
    .eq("patient_id", patient.id)
    .eq("is_active", true)
    .order("name");
  const medList = meds ?? [];
  const medIds = medList.map((m) => m.id);
  const medById = new Map(medList.map((m) => [m.id, m]));

  const { data: scheds } = medIds.length
    ? await supabase
        .from("medication_schedules")
        .select("patient_medication_id, schedule_type, time_of_day, interval_hours")
        .in("patient_medication_id", medIds)
        .eq("is_active", true)
    : { data: [] };
  const schedByMed = new Map<string, string[]>();
  for (const s of scheds ?? []) {
    const label =
      s.schedule_type === "prn"
        ? "Según necesidad"
        : s.schedule_type === "interval"
          ? `Cada ${s.interval_hours} h`
          : (s.time_of_day ?? "").slice(0, 5);
    const arr = schedByMed.get(s.patient_medication_id) ?? [];
    arr.push(label);
    schedByMed.set(s.patient_medication_id, arr);
  }

  const { data: medLogs } = medIds.length
    ? await supabase
        .from("medication_logs")
        .select(
          "patient_medication_id, status, scheduled_for, administered_at, created_at, recorded_by",
        )
        .in("patient_medication_id", medIds)
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: true })
    : { data: [] };
  const logs = medLogs ?? [];

  // Adherencia por medicamento
  const adherence = new Map<string, { given: number; skipped: number; postponed: number }>();
  for (const l of logs) {
    const a = adherence.get(l.patient_medication_id) ?? {
      given: 0,
      skipped: 0,
      postponed: 0,
    };
    if (l.status === "given") a.given++;
    else if (l.status === "skipped") a.skipped++;
    else if (l.status === "postponed") a.postponed++;
    adherence.set(l.patient_medication_id, a);
  }

  const { data: taskRows } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("patient_id", patient.id)
    .eq("is_active", true);
  const taskById = new Map((taskRows ?? []).map((t) => [t.id, t.title]));
  const taskIds = (taskRows ?? []).map((t) => t.id);

  const { data: taskLogs } = taskIds.length
    ? await supabase
        .from("task_logs")
        .select("task_id, status, created_at")
        .in("task_id", taskIds)
        .gte("created_at", start)
        .lt("created_at", end)
    : { data: [] };
  const taskAdh = new Map<string, { done: number; skipped: number }>();
  for (const l of taskLogs ?? []) {
    const a = taskAdh.get(l.task_id) ?? { done: 0, skipped: 0 };
    if (l.status === "done") a.done++;
    else a.skipped++;
    taskAdh.set(l.task_id, a);
  }

  const { data: appts } = await supabase
    .from("appointments")
    .select("title, doctor_name, specialty, scheduled_at, status")
    .eq("patient_id", patient.id)
    .gte("scheduled_at", start)
    .lt("scheduled_at", end)
    .order("scheduled_at", { ascending: true });

  const { data: notes } = await supabase
    .from("daily_notes")
    .select("note_date, content, author_id")
    .eq("patient_id", patient.id)
    .gte("note_date", fromStr)
    .lte("note_date", toStr)
    .order("note_date", { ascending: false });

  // Nombres (recorded_by, author)
  const ids = Array.from(
    new Set([
      ...logs.map((l) => l.recorded_by),
      ...(notes ?? []).map((n) => n.author_id),
    ]),
  ).filter(Boolean) as string[];
  const nameById = new Map<string, string>();
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    for (const p of profs ?? []) nameById.set(p.id, p.full_name ?? "—");
  }

  const age = patient.birth_date
    ? differenceInYears(new Date(), new Date(`${patient.birth_date}T12:00:00`))
    : null;

  const cell = "px-2 py-1 text-left align-top";

  return (
    <div className="space-y-4">
      <div className="no-print space-y-3">
        <h1 className="text-2xl font-bold text-gray-900">Reporte del paciente</h1>
        <form method="get" className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm text-gray-600">Desde</label>
            <input
              type="date"
              name="from"
              defaultValue={fromStr}
              className="min-h-touch w-full rounded-xl border border-gray-300 px-3 text-base"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Hasta</label>
            <input
              type="date"
              name="to"
              defaultValue={toStr}
              className="min-h-touch w-full rounded-xl border border-gray-300 px-3 text-base"
            />
          </div>
          <button
            type="submit"
            className="col-span-2 min-h-touch rounded-xl border border-gray-300 font-semibold text-gray-700"
          >
            Actualizar rango
          </button>
        </form>
        <PrintButton />
      </div>

      {/* Documento imprimible */}
      <article className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-800 print:border-0 print:p-0">
        <header>
          <h2 className="text-xl font-bold text-gray-900">{patient.full_name}</h2>
          <p className="text-gray-600">
            {patient.birth_date
              ? `${formatApp(`${patient.birth_date}T12:00:00`, "d 'de' MMMM yyyy")}${
                  age != null ? ` · ${age} años` : ""
                }`
              : "Sin fecha de nacimiento"}
          </p>
          {patient.notes ? (
            <p className="mt-1 text-gray-600">{patient.notes}</p>
          ) : null}
          <p className="mt-2 text-gray-500">
            Período: {formatApp(`${fromStr}T12:00:00`, "d MMM yyyy")} –{" "}
            {formatApp(`${toStr}T12:00:00`, "d MMM yyyy")} · Generado el{" "}
            {formatApp(new Date().toISOString(), "d MMM yyyy, h:mm a")}
          </p>
        </header>

        <Section title="Medicamentos activos">
          {medList.length === 0 ? (
            <p className="text-gray-500">Sin medicamentos activos.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-gray-500">
                  <th className={cell}>Medicamento</th>
                  <th className={cell}>Dosis</th>
                  <th className={cell}>Frecuencia</th>
                  <th className={cell}>Dado</th>
                  <th className={cell}>Omitido</th>
                </tr>
              </thead>
              <tbody>
                {medList.map((m) => {
                  const a = adherence.get(m.id);
                  return (
                    <tr key={m.id} className="border-b border-gray-100">
                      <td className={cell}>{m.name}</td>
                      <td className={cell}>
                        {m.dose != null ? `${m.dose} ${m.unit ?? ""}` : "—"}
                      </td>
                      <td className={cell}>
                        {(schedByMed.get(m.id) ?? []).join(", ") || "—"}
                      </td>
                      <td className={cell}>{a?.given ?? 0}</td>
                      <td className={cell}>{a?.skipped ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Registro de medicamentos">
          {logs.length === 0 ? (
            <p className="text-gray-500">Sin registros en este período.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-gray-500">
                  <th className={cell}>Fecha y hora</th>
                  <th className={cell}>Medicamento</th>
                  <th className={cell}>Estado</th>
                  <th className={cell}>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className={cell}>
                      {formatApp(
                        l.administered_at ?? l.scheduled_for ?? l.created_at,
                        "d MMM, h:mm a",
                      )}
                    </td>
                    <td className={cell}>
                      {medById.get(l.patient_medication_id)?.name ?? "—"}
                    </td>
                    <td className={cell}>{MED_STATUS[l.status] ?? l.status}</td>
                    <td className={cell}>
                      {l.recorded_by ? nameById.get(l.recorded_by) ?? "—" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Tareas">
          {(taskRows ?? []).length === 0 ? (
            <p className="text-gray-500">Sin tareas.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-gray-500">
                  <th className={cell}>Tarea</th>
                  <th className={cell}>Hechas</th>
                  <th className={cell}>Omitidas</th>
                </tr>
              </thead>
              <tbody>
                {(taskRows ?? []).map((t) => {
                  const a = taskAdh.get(t.id);
                  return (
                    <tr key={t.id} className="border-b border-gray-100">
                      <td className={cell}>{taskById.get(t.id)}</td>
                      <td className={cell}>{a?.done ?? 0}</td>
                      <td className={cell}>{a?.skipped ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Citas">
          {(appts ?? []).length === 0 ? (
            <p className="text-gray-500">Sin citas en este período.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-gray-500">
                  <th className={cell}>Fecha</th>
                  <th className={cell}>Cita</th>
                  <th className={cell}>Doctor</th>
                  <th className={cell}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(appts ?? []).map((a, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className={cell}>
                      {formatApp(a.scheduled_at, "d MMM, h:mm a")}
                    </td>
                    <td className={cell}>{a.title}</td>
                    <td className={cell}>{a.doctor_name ?? "—"}</td>
                    <td className={cell}>{APPT_STATUS[a.status] ?? a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Notas diarias">
          {(notes ?? []).length === 0 ? (
            <p className="text-gray-500">Sin notas en este período.</p>
          ) : (
            <ul className="space-y-2">
              {(notes ?? []).map((n, i) => (
                <li key={i} className="border-b border-gray-100 pb-2">
                  <p className="font-semibold text-gray-700">
                    {formatApp(`${n.note_date}T12:00:00`, "d MMM yyyy")}
                    {" · "}
                    <span className="font-normal text-gray-500">
                      {n.author_id ? nameById.get(n.author_id) ?? "—" : "—"}
                    </span>
                  </p>
                  <p className="whitespace-pre-wrap text-gray-800">{n.content}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </article>
    </div>
  );
}
