"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatTime } from "@/lib/time";
import { stateColor, type OccurrenceState } from "@/lib/status";
import { recordTask, type RecordTaskResult } from "@/app/(app)/actions/tasks";

export type TaskDTO = {
  key: string;
  taskId: string;
  scheduleId: string;
  title: string;
  category: string | null;
  scheduledForISO: string;
  timeLabel: string;
  state: OccurrenceState;
};

export type TaskGroup = { timeLabel: string; items: TaskDTO[] };

const DONE_LABEL: Partial<Record<OccurrenceState, string>> = { given: "Hecho" };

export function TaskList({ groups }: { groups: TaskGroup[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [override, setOverride] = useState<Record<string, OccurrenceState>>({});
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [sheetFor, setSheetFor] = useState<TaskDTO | null>(null);
  const [note, setNote] = useState("");

  const stateOf = (t: TaskDTO): OccurrenceState => override[t.key] ?? t.state;

  async function perform(
    t: TaskDTO,
    optimistic: OccurrenceState,
    status: "done" | "skipped",
    noteText: string | null,
  ) {
    setBusy((m) => ({ ...m, [t.key]: true }));
    setMsg((m) => ({ ...m, [t.key]: "" }));
    setOverride((m) => ({ ...m, [t.key]: optimistic }));
    try {
      const res: RecordTaskResult = await recordTask({
        taskId: t.taskId,
        scheduleId: t.scheduleId,
        scheduledForISO: t.scheduledForISO,
        status,
        note: noteText,
      });
      if (res.ok) {
        startTransition(() => router.refresh());
      } else if ("conflict" in res && res.conflict) {
        setOverride((m) => ({
          ...m,
          [t.key]: res.status === "done" ? "given" : "skipped",
        }));
        setMsg((m) => ({
          ...m,
          [t.key]: `Ya registrado por ${res.recordedByName ?? "otro cuidador"}${
            res.completedAt ? ` a las ${formatTime(res.completedAt)}` : ""
          }`,
        }));
      } else {
        setOverride((m) => {
          const n = { ...m };
          delete n[t.key];
          return n;
        });
        setMsg((m) => ({ ...m, [t.key]: res.message }));
      }
    } catch {
      setOverride((m) => {
        const n = { ...m };
        delete n[t.key];
        return n;
      });
      setMsg((m) => ({
        ...m,
        [t.key]:
          typeof navigator !== "undefined" && !navigator.onLine
            ? "Sin conexión — no se guardó"
            : "No se pudo registrar",
      }));
    } finally {
      setBusy((m) => ({ ...m, [t.key]: false }));
    }
  }

  function complete(t: TaskDTO) {
    void perform(t, "given", "done", null);
  }
  function skip(t: TaskDTO) {
    const n = note.trim() || null;
    setSheetFor(null);
    setNote("");
    void perform(t, "skipped", "skipped", n);
  }

  if (groups.length === 0) {
    return <EmptyState title="No hay tareas programadas para hoy" />;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.timeLabel} className="space-y-2">
          <h2 className="px-1 text-sm font-bold uppercase tracking-wide text-muted">
            {group.timeLabel}
          </h2>
          {group.items.map((t) => {
            const s = stateOf(t);
            const resolved = s === "given" || s === "skipped";
            return (
              <Card
                key={t.key}
                accent={stateColor(s)}
                className="flex items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-ink">
                    {t.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge state={s} label={DONE_LABEL[s]} />
                    {t.category ? (
                      <span className="text-sm text-muted">{t.category}</span>
                    ) : null}
                    {msg[t.key] ? (
                      <span className="text-sm text-muted">{msg[t.key]}</span>
                    ) : null}
                  </div>
                </div>
                {resolved ? null : (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button onClick={() => complete(t)} disabled={busy[t.key]}>
                      Completada
                    </Button>
                    <Button
                      variant="secondary"
                      className="px-3"
                      onClick={() => {
                        setSheetFor(t);
                        setNote("");
                      }}
                      disabled={busy[t.key]}
                      aria-label="Más opciones"
                    >
                      ⋯
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ))}

      <Sheet
        open={sheetFor !== null}
        onClose={() => setSheetFor(null)}
        title={sheetFor ? `${sheetFor.title} · ${sheetFor.timeLabel}` : undefined}
      >
        {sheetFor ? (
          <div className="space-y-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota (opcional)"
              rows={2}
              className="w-full rounded-xl border border-line p-3 text-base"
            />
            <Button
              variant="danger"
              className="w-full"
              onClick={() => skip(sheetFor)}
            >
              Omitir tarea
            </Button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
