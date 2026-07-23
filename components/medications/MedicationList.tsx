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
import {
  recordDose,
  recordPrn,
  undoMedLog,
  type RecordDoseResult,
  type RecordPrnResult,
} from "@/app/(app)/actions/meds";

export type OccDTO = {
  key: string;
  medicationId: string;
  scheduleId: string;
  name: string;
  dose: number | null;
  unit: string | null;
  instructions: string | null;
  scheduledForISO: string;
  timeLabel: string;
  state: OccurrenceState;
  recordedByName: string | null;
};

export type OccGroup = { timeLabel: string; items: OccDTO[] };

export type PrnDTO = {
  medicationId: string;
  scheduleId: string;
  name: string;
  dose: number | null;
  unit: string | null;
  reason: string | null;
  minHours: number | null;
  lastDoseISO: string | null;
  dosesToday: number;
};

function doseLabel(dose: number | null, unit: string | null): string {
  if (dose == null) return unit ?? "";
  return `${dose}${unit ? ` ${unit}` : ""}`;
}

export function MedicationList({
  groups,
  prn,
  hidePrn = false,
}: {
  groups: OccGroup[];
  prn: PrnDTO[];
  hidePrn?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [override, setOverride] = useState<Record<string, OccurrenceState>>({});
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [sheetFor, setSheetFor] = useState<OccDTO | null>(null);
  const [note, setNote] = useState("");
  // Id del log recién creado por key, para permitir "Deshacer".
  const [lastLog, setLastLog] = useState<Record<string, string>>({});

  // PRN confirm
  const [prnConfirm, setPrnConfirm] = useState<{
    p: PrnDTO;
    lastAt: string;
    lastByName: string | null;
    minHours: number;
  } | null>(null);
  const [prnBusy, setPrnBusy] = useState<Record<string, boolean>>({});
  const [prnMsg, setPrnMsg] = useState<Record<string, string>>({});
  const [prnLastLog, setPrnLastLog] = useState<Record<string, string>>({});

  const stateOf = (o: OccDTO): OccurrenceState => override[o.key] ?? o.state;

  function setState(key: string, s: OccurrenceState) {
    setOverride((m) => ({ ...m, [key]: s }));
  }
  function revert(key: string) {
    setOverride((m) => {
      const n = { ...m };
      delete n[key];
      return n;
    });
  }

  async function perform(
    o: OccDTO,
    optimistic: OccurrenceState,
    fn: () => Promise<RecordDoseResult>,
  ) {
    setBusy((m) => ({ ...m, [o.key]: true }));
    setMsg((m) => ({ ...m, [o.key]: "" }));
    setState(o.key, optimistic);
    try {
      const res = await fn();
      if (res.ok) {
        if (res.logId) setLastLog((m) => ({ ...m, [o.key]: res.logId! }));
        startTransition(() => router.refresh());
      } else if ("conflict" in res && res.conflict) {
        // Otro cuidador ya lo registró: mostrar quién y cuándo (spec 3.5).
        setState(o.key, res.status);
        setMsg((m) => ({
          ...m,
          [o.key]: `Ya registrado por ${res.recordedByName ?? "otro cuidador"}${
            res.administeredAt ? ` a las ${formatTime(res.administeredAt)}` : ""
          }`,
        }));
      } else {
        revert(o.key);
        setMsg((m) => ({ ...m, [o.key]: res.message }));
      }
    } catch {
      revert(o.key);
      setMsg((m) => ({
        ...m,
        [o.key]:
          typeof navigator !== "undefined" && !navigator.onLine
            ? "Sin conexión — no se guardó"
            : "No se pudo registrar",
      }));
    } finally {
      setBusy((m) => ({ ...m, [o.key]: false }));
    }
  }

  async function undo(o: OccDTO) {
    const id = lastLog[o.key];
    if (!id) return;
    setBusy((m) => ({ ...m, [o.key]: true }));
    const res = await undoMedLog(id);
    setBusy((m) => ({ ...m, [o.key]: false }));
    if (res.ok) {
      revert(o.key);
      setLastLog((m) => {
        const n = { ...m };
        delete n[o.key];
        return n;
      });
      setMsg((m) => ({ ...m, [o.key]: "" }));
      startTransition(() => router.refresh());
    } else {
      setMsg((m) => ({ ...m, [o.key]: res.message ?? "No se pudo deshacer" }));
    }
  }

  function markGiven(o: OccDTO) {
    void perform(o, "given", () =>
      recordDose({
        patientMedicationId: o.medicationId,
        scheduleId: o.scheduleId,
        scheduledForISO: o.scheduledForISO,
        status: "given",
      }),
    );
  }

  function skip(o: OccDTO) {
    const n = note.trim() || null;
    setSheetFor(null);
    setNote("");
    void perform(o, "skipped", () =>
      recordDose({
        patientMedicationId: o.medicationId,
        scheduleId: o.scheduleId,
        scheduledForISO: o.scheduledForISO,
        status: "skipped",
        note: n,
      }),
    );
  }

  function postpone(o: OccDTO, hours: number) {
    const n = note.trim() || null;
    setSheetFor(null);
    setNote("");
    const postponedToISO = new Date(Date.now() + hours * 3_600_000).toISOString();
    void perform(o, "postponed", () =>
      recordDose({
        patientMedicationId: o.medicationId,
        scheduleId: o.scheduleId,
        scheduledForISO: o.scheduledForISO,
        status: "postponed",
        postponedToISO,
        note: n,
      }),
    );
  }

  async function doPrn(p: PrnDTO, override = false) {
    setPrnBusy((m) => ({ ...m, [p.medicationId]: true }));
    setPrnMsg((m) => ({ ...m, [p.medicationId]: "" }));
    try {
      const res: RecordPrnResult = await recordPrn({
        patientMedicationId: p.medicationId,
        scheduleId: p.scheduleId,
        override,
      });
      if (res.ok) {
        setPrnConfirm(null);
        if (res.logId) {
          const id = res.logId;
          setPrnLastLog((m) => ({ ...m, [p.medicationId]: id }));
          setPrnMsg((m) => ({ ...m, [p.medicationId]: "Registrada ✓" }));
        }
        startTransition(() => router.refresh());
      } else if ("needsConfirm" in res && res.needsConfirm) {
        setPrnConfirm({
          p,
          lastAt: res.lastAt,
          lastByName: res.lastByName,
          minHours: res.minHours,
        });
      } else {
        setPrnMsg((m) => ({ ...m, [p.medicationId]: res.message }));
      }
    } catch {
      setPrnMsg((m) => ({
        ...m,
        [p.medicationId]:
          typeof navigator !== "undefined" && !navigator.onLine
            ? "Sin conexión — no se guardó"
            : "No se pudo registrar",
      }));
    } finally {
      setPrnBusy((m) => ({ ...m, [p.medicationId]: false }));
    }
  }

  async function undoPrn(p: PrnDTO) {
    const id = prnLastLog[p.medicationId];
    if (!id) return;
    setPrnBusy((m) => ({ ...m, [p.medicationId]: true }));
    const res = await undoMedLog(id);
    setPrnBusy((m) => ({ ...m, [p.medicationId]: false }));
    if (res.ok) {
      setPrnLastLog((m) => {
        const n = { ...m };
        delete n[p.medicationId];
        return n;
      });
      setPrnMsg((m) => ({ ...m, [p.medicationId]: "" }));
      startTransition(() => router.refresh());
    } else {
      setPrnMsg((m) => ({
        ...m,
        [p.medicationId]: res.message ?? "No se pudo deshacer",
      }));
    }
  }

  const nothingScheduled = groups.length === 0;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        {nothingScheduled ? (
          <EmptyState
            title="No hay medicamentos programados para hoy"
            hint="Los medicamentos según necesidad aparecen más abajo."
          />
        ) : (
          groups.map((group) => (
            <div key={group.timeLabel} className="space-y-2">
              <h2 className="px-1 text-sm font-bold uppercase tracking-wide text-muted">
                {group.timeLabel}
              </h2>
              {group.items.map((o) => {
                const s = stateOf(o);
                const resolved = s === "given" || s === "skipped" || s === "postponed";
                return (
                  <Card
                    key={o.key}
                    accent={stateColor(s)}
                    className="flex items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-ink">
                        {o.name}{" "}
                        <span className="font-normal text-muted">
                          {doseLabel(o.dose, o.unit)}
                        </span>
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusBadge state={s} />
                        {msg[o.key] ? (
                          <span className="text-sm text-muted">{msg[o.key]}</span>
                        ) : null}
                      </div>
                    </div>
                    {resolved ? (
                      lastLog[o.key] ? (
                        <Button
                          variant="ghost"
                          className="shrink-0 px-3"
                          onClick={() => undo(o)}
                          disabled={busy[o.key]}
                        >
                          Deshacer
                        </Button>
                      ) : null
                    ) : (
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          onClick={() => markGiven(o)}
                          disabled={busy[o.key]}
                          aria-label={`Marcar ${o.name} como dado`}
                        >
                          Dado
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setSheetFor(o);
                            setNote("");
                          }}
                          disabled={busy[o.key]}
                          aria-label="Más opciones"
                          className="px-3"
                        >
                          ⋯
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ))
        )}
      </section>

      {/* Según necesidad (PRN) */}
      {hidePrn ? null : (
      <section className="space-y-2">
        <h2 className="px-1 text-sm font-bold uppercase tracking-wide text-muted">
          Según necesidad (PRN)
        </h2>
        {prn.length === 0 ? (
          <EmptyState title="Sin medicamentos según necesidad" />
        ) : (
          prn.map((p) => (
            <Card key={p.medicationId} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-ink">
                  {p.name}{" "}
                  <span className="font-normal text-muted">
                    {doseLabel(p.dose, p.unit)}
                  </span>
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {p.reason ? `Para ${p.reason}. ` : ""}
                  {p.lastDoseISO
                    ? `Última dosis: ${formatTime(p.lastDoseISO)} (${p.dosesToday} hoy)`
                    : "Sin dosis hoy"}
                </p>
                {prnMsg[p.medicationId] ? (
                  <p className="mt-1 text-sm text-muted">
                    {prnMsg[p.medicationId]}
                  </p>
                ) : null}
              </div>
              {prnLastLog[p.medicationId] ? (
                <Button
                  variant="ghost"
                  onClick={() => undoPrn(p)}
                  disabled={prnBusy[p.medicationId]}
                  className="shrink-0 px-3"
                >
                  Deshacer
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => doPrn(p)}
                  disabled={prnBusy[p.medicationId]}
                  className="shrink-0"
                >
                  Registrar dosis
                </Button>
              )}
            </Card>
          ))
        )}
      </section>
      )}

      {/* Sheet de acciones secundarias */}
      <Sheet
        open={sheetFor !== null}
        onClose={() => setSheetFor(null)}
        title={sheetFor ? `${sheetFor.name} · ${sheetFor.timeLabel}` : undefined}
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
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => postpone(sheetFor, 1)}>
                Posponer 1 h
              </Button>
              <Button variant="secondary" onClick={() => postpone(sheetFor, 2)}>
                Posponer 2 h
              </Button>
            </div>
            <Button
              variant="danger"
              className="w-full"
              onClick={() => skip(sheetFor)}
            >
              Omitir dosis
            </Button>
          </div>
        ) : null}
      </Sheet>

      {/* Confirmación PRN por mínimo entre dosis */}
      <Sheet
        open={prnConfirm !== null}
        onClose={() => setPrnConfirm(null)}
        title="Confirmar dosis"
      >
        {prnConfirm ? (
          <div className="space-y-4">
            <p className="text-base text-ink/80">
              La última dosis de <strong>{prnConfirm.p.name}</strong> fue a las{" "}
              <strong>{formatTime(prnConfirm.lastAt)}</strong>
              {prnConfirm.lastByName ? ` por ${prnConfirm.lastByName}` : ""}. El
              mínimo entre dosis es de {prnConfirm.minHours} h.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setPrnConfirm(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => doPrn(prnConfirm.p, true)}
                disabled={prnBusy[prnConfirm.p.medicationId]}
              >
                Dar de todos modos
              </Button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
