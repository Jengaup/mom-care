import { getSessionUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import { createClient } from "@/lib/supabase/server";
import { formatApp, todayInAppTz } from "@/lib/time";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { NoteEditor } from "@/components/notes/NoteEditor";

export const dynamic = "force-dynamic";

export default async function NotasPage() {
  const user = await getSessionUser();
  const patient = await getActivePatient();
  if (!patient || !user) {
    return <EmptyState title="No hay un paciente asignado a tu cuenta." />;
  }

  const supabase = await createClient();
  const today = todayInAppTz();

  const { data: todayNote } = await supabase
    .from("daily_notes")
    .select("content")
    .eq("patient_id", patient.id)
    .eq("note_date", today)
    .eq("author_id", user.id)
    .maybeSingle();

  const { data: history } = await supabase
    .from("daily_notes")
    .select("id, note_date, content, author_id, updated_at")
    .eq("patient_id", patient.id)
    .order("note_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(60);

  const authorIds = Array.from(new Set((history ?? []).map((n) => n.author_id)));
  const authorName = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);
    for (const p of profs ?? []) authorName.set(p.id, p.full_name ?? "—");
  }

  const past = (history ?? []).filter((n) => n.note_date !== today);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold text-ink">Nota de hoy</h1>
        <p className="text-sm text-muted">
          {formatApp(`${today}T12:00:00`, "EEEE, d 'de' MMMM")}
        </p>
        <NoteEditor initial={todayNote?.content ?? ""} />
      </div>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-bold uppercase tracking-wide text-muted">
          Historial
        </h2>
        {past.length === 0 ? (
          <EmptyState title="Aún no hay notas anteriores" />
        ) : (
          past.map((n) => (
            <Card key={n.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink/80">
                  {formatApp(`${n.note_date}T12:00:00`, "d MMM yyyy")}
                </p>
                <p className="text-sm text-muted">
                  {authorName.get(n.author_id) ?? "—"}
                </p>
              </div>
              <p className="whitespace-pre-wrap text-ink">{n.content}</p>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
