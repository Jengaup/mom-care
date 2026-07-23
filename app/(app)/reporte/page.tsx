import { differenceInYears, subDays } from "date-fns";
import { getActivePatient } from "@/lib/patient";
import { createClient } from "@/lib/supabase/server";
import { dayRangeUtc, formatApp, todayInAppTz } from "@/lib/time";
import { OBS_CONFIG, formatObsValue, type ObsType } from "@/lib/observations";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportActions } from "@/components/report/ReportActions";

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
      <h2 className="mb-2 border-b border-line pb-1 text-lg font-bold text-ink">
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

  // Contactos (todos, no dependen del período).
  const { data: contacts } = await supabase
    .from("contacts")
    .select("name, role, phone, note, is_emergency")
    .eq("patient_id", patient.id)
    .order("is_emergency", { ascending: false })
    .order("sort_order")
    .order("name");
  const contactList = contacts ?? [];

  // Signos vitales del período.
  const { data: obsRows } = await supabase
    .from("observations")
    .select("type, value_num, value_text, unit, note, measured_at, recorded_by")
    .eq("patient_id", patient.id)
    .gte("measured_at", start)
    .lt("measured_at", end)
    .order("measured_at", { ascending: false });
  const obsList = obsRows ?? [];

  // Resumen de signos por tipo (conteo, último, mín/máx en numéricos).
  type ObsSummary = {
    type: ObsType;
    count: number;
    latest: string;
    latestAt: string;
    min: number | null;
    max: number | null;
  };
  const obsSummary: ObsSummary[] = [];
  {
    const byType = new Map<ObsType, typeof obsList>();
    for (const o of obsList) {
      const arr = byType.get(o.type as ObsType) ?? [];
      arr.push(o);
      byType.set(o.type as ObsType, arr);
    }
    for (const [type, arr] of byType) {
      // arr viene desc por measured_at → el primero es el más reciente.
      const cfg = OBS_CONFIG[type];
      const nums =
        cfg.kind === "text"
          ? []
          : arr
              .map((o) => o.value_num)
              .filter((v): v is number => v != null);
      const first = arr[0]!;
      obsSummary.push({
        type,
        count: arr.length,
        latest: formatObsValue(type, first.value_num, first.value_text, first.unit),
        latestAt: formatApp(first.measured_at, "d MMM, h:mm a"),
        min: nums.length ? Math.min(...nums) : null,
        max: nums.length ? Math.max(...nums) : null,
      });
    }
  }

  // Nombres (recorded_by, author)
  const ids = Array.from(
    new Set([
      ...logs.map((l) => l.recorded_by),
      ...(notes ?? []).map((n) => n.author_id),
      ...obsList.map((o) => o.recorded_by),
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

  // Resumen de texto plano para «Compartir».
  const periodLabel = `${formatApp(`${fromStr}T12:00:00`, "d MMM yyyy")} – ${formatApp(
    `${toStr}T12:00:00`,
    "d MMM yyyy",
  )}`;
  const totGiven = logs.filter((l) => l.status === "given").length;
  const totSkipped = logs.filter((l) => l.status === "skipped").length;
  const emergencyContacts = contactList.filter((c) => c.is_emergency);
  const shareLines: string[] = [
    `Reporte de ${patient.full_name}${age != null ? ` (${age} años)` : ""}`,
    `Período: ${periodLabel}`,
    "",
    `Medicamentos: ${totGiven} dados, ${totSkipped} omitidos.`,
  ];
  if (obsSummary.length) {
    shareLines.push("", "Signos recientes:");
    for (const s of obsSummary) {
      shareLines.push(`• ${OBS_CONFIG[s.type].label}: ${s.latest} (${s.latestAt})`);
    }
  }
  if (patient.allergies) shareLines.push("", `Alergias: ${patient.allergies}`);
  if (emergencyContacts.length) {
    shareLines.push("", "Emergencia:");
    for (const c of emergencyContacts) {
      shareLines.push(`• ${c.name}${c.phone ? ` — ${c.phone}` : ""}`);
    }
  }
  const shareText = shareLines.join("\n");

  const hasEmergencyInfo =
    patient.blood_type ||
    patient.allergies ||
    patient.conditions ||
    patient.insurance ||
    patient.emergency_note;

  const cell = "px-2 py-1 text-left align-top";

  return (
    <div className="space-y-4">
      <div className="no-print space-y-3">
        <h1 className="font-display text-2xl font-semibold text-ink">Reporte del paciente</h1>
        <form method="get" className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm text-muted">Desde</label>
            <input
              type="date"
              name="from"
              defaultValue={fromStr}
              className="min-h-touch w-full rounded-xl border border-line px-3 text-base"
            />
          </div>
          <div>
            <label className="text-sm text-muted">Hasta</label>
            <input
              type="date"
              name="to"
              defaultValue={toStr}
              className="min-h-touch w-full rounded-xl border border-line px-3 text-base"
            />
          </div>
          <button
            type="submit"
            className="col-span-2 min-h-touch rounded-xl border border-line font-semibold text-ink/80"
          >
            Actualizar rango
          </button>
        </form>
        <ReportActions
          shareTitle={`Reporte de ${patient.full_name}`}
          shareText={shareText}
        />
      </div>

      {/* Documento imprimible */}
      <article className="rounded-2xl border border-line bg-white p-5 text-sm text-ink print:border-0 print:p-0">
        <header>
          <h2 className="text-xl font-bold text-ink">{patient.full_name}</h2>
          <p className="text-muted">
            {patient.birth_date
              ? `${formatApp(`${patient.birth_date}T12:00:00`, "d 'de' MMMM yyyy")}${
                  age != null ? ` · ${age} años` : ""
                }`
              : "Sin fecha de nacimiento"}
          </p>
          {patient.notes ? (
            <p className="mt-1 text-muted">{patient.notes}</p>
          ) : null}
          <p className="mt-2 text-muted">
            Período: {formatApp(`${fromStr}T12:00:00`, "d MMM yyyy")} –{" "}
            {formatApp(`${toStr}T12:00:00`, "d MMM yyyy")} · Generado el{" "}
            {formatApp(new Date().toISOString(), "d MMM yyyy, h:mm a")}
          </p>
        </header>

        {hasEmergencyInfo ? (
          <Section title="Información clave">
            <table className="w-full border-collapse">
              <tbody>
                {patient.blood_type ? (
                  <tr className="border-b border-line">
                    <td className={`${cell} w-40 text-muted`}>Tipo de sangre</td>
                    <td className={cell}>{patient.blood_type}</td>
                  </tr>
                ) : null}
                {patient.allergies ? (
                  <tr className="border-b border-line">
                    <td className={`${cell} text-muted`}>Alergias</td>
                    <td className={cell}>{patient.allergies}</td>
                  </tr>
                ) : null}
                {patient.conditions ? (
                  <tr className="border-b border-line">
                    <td className={`${cell} text-muted`}>Condiciones</td>
                    <td className={cell}>{patient.conditions}</td>
                  </tr>
                ) : null}
                {patient.insurance ? (
                  <tr className="border-b border-line">
                    <td className={`${cell} text-muted`}>Seguro</td>
                    <td className={cell}>{patient.insurance}</td>
                  </tr>
                ) : null}
                {patient.emergency_note ? (
                  <tr className="border-b border-line">
                    <td className={`${cell} text-muted`}>Nota</td>
                    <td className={cell}>{patient.emergency_note}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Section>
        ) : null}

        <Section title="Contactos">
          {contactList.length === 0 ? (
            <p className="text-muted">Sin contactos registrados.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className={cell}>Nombre</th>
                  <th className={cell}>Rol</th>
                  <th className={cell}>Teléfono</th>
                  <th className={cell}>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {contactList.map((c, i) => (
                  <tr key={i} className="border-b border-line">
                    <td className={cell}>{c.name}</td>
                    <td className={cell}>{c.role ?? "—"}</td>
                    <td className={cell}>{c.phone ?? "—"}</td>
                    <td className={cell}>
                      {c.is_emergency ? "Emergencia" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Medicamentos activos">
          {medList.length === 0 ? (
            <p className="text-muted">Sin medicamentos activos.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line text-muted">
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
                    <tr key={m.id} className="border-b border-line">
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
            <p className="text-muted">Sin registros en este período.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className={cell}>Fecha y hora</th>
                  <th className={cell}>Medicamento</th>
                  <th className={cell}>Estado</th>
                  <th className={cell}>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i} className="border-b border-line">
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

        <Section title="Signos vitales">
          {obsList.length === 0 ? (
            <p className="text-muted">Sin signos registrados en este período.</p>
          ) : (
            <>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className={cell}>Signo</th>
                    <th className={cell}>Último</th>
                    <th className={cell}>Cuándo</th>
                    <th className={cell}>Mín</th>
                    <th className={cell}>Máx</th>
                    <th className={cell}>Lecturas</th>
                  </tr>
                </thead>
                <tbody>
                  {obsSummary.map((s) => (
                    <tr key={s.type} className="border-b border-line">
                      <td className={cell}>{OBS_CONFIG[s.type].label}</td>
                      <td className={cell}>{s.latest}</td>
                      <td className={cell}>{s.latestAt}</td>
                      <td className={cell}>{s.min ?? "—"}</td>
                      <td className={cell}>{s.max ?? "—"}</td>
                      <td className={cell}>{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="mb-1 mt-3 text-sm font-bold text-muted">
                Detalle
              </h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className={cell}>Fecha y hora</th>
                    <th className={cell}>Signo</th>
                    <th className={cell}>Valor</th>
                    <th className={cell}>Registrado por</th>
                  </tr>
                </thead>
                <tbody>
                  {obsList.map((o, i) => (
                    <tr key={i} className="border-b border-line">
                      <td className={cell}>
                        {formatApp(o.measured_at, "d MMM, h:mm a")}
                      </td>
                      <td className={cell}>
                        {OBS_CONFIG[o.type as ObsType].label}
                      </td>
                      <td className={cell}>
                        {formatObsValue(
                          o.type as ObsType,
                          o.value_num,
                          o.value_text,
                          o.unit,
                        )}
                        {o.note ? ` · ${o.note}` : ""}
                      </td>
                      <td className={cell}>
                        {o.recorded_by ? nameById.get(o.recorded_by) ?? "—" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Section>

        <Section title="Tareas">
          {(taskRows ?? []).length === 0 ? (
            <p className="text-muted">Sin tareas.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className={cell}>Tarea</th>
                  <th className={cell}>Hechas</th>
                  <th className={cell}>Omitidas</th>
                </tr>
              </thead>
              <tbody>
                {(taskRows ?? []).map((t) => {
                  const a = taskAdh.get(t.id);
                  return (
                    <tr key={t.id} className="border-b border-line">
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
            <p className="text-muted">Sin citas en este período.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className={cell}>Fecha</th>
                  <th className={cell}>Cita</th>
                  <th className={cell}>Doctor</th>
                  <th className={cell}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(appts ?? []).map((a, i) => (
                  <tr key={i} className="border-b border-line">
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
            <p className="text-muted">Sin notas en este período.</p>
          ) : (
            <ul className="space-y-2">
              {(notes ?? []).map((n, i) => (
                <li key={i} className="border-b border-line pb-2">
                  <p className="font-semibold text-ink/80">
                    {formatApp(`${n.note_date}T12:00:00`, "d MMM yyyy")}
                    {" · "}
                    <span className="font-normal text-muted">
                      {n.author_id ? nameById.get(n.author_id) ?? "—" : "—"}
                    </span>
                  </p>
                  <p className="whitespace-pre-wrap text-ink">{n.content}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </article>
    </div>
  );
}
