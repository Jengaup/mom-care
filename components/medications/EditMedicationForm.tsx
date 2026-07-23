"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { updateMedication } from "@/app/(app)/actions/meds";

type ScheduleType = "fixed" | "interval" | "prn";

export type EditInitial = {
  name: string;
  dose: string;
  unit: string;
  instructions: string;
  isActive: boolean;
  scheduleType: ScheduleType;
  fixedTimes: string[];
  everyDay: boolean;
  days: number[];
  intervalHours: string;
  anchorTime: string;
  prnReason: string;
  prnMinHours: string;
};

const DAYS = [
  { iso: 1, label: "L" },
  { iso: 2, label: "M" },
  { iso: 3, label: "X" },
  { iso: 4, label: "J" },
  { iso: 5, label: "V" },
  { iso: 6, label: "S" },
  { iso: 7, label: "D" },
];

const field = "min-h-touch w-full rounded-xl border border-line px-4 text-base";

export function EditMedicationForm({
  medicationId,
  initial,
}: {
  medicationId: string;
  initial: EditInitial;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [dose, setDose] = useState(initial.dose);
  const [unit, setUnit] = useState(initial.unit);
  const [instructions, setInstructions] = useState(initial.instructions);
  const [isActive, setIsActive] = useState(initial.isActive);

  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    initial.scheduleType,
  );
  const [fixedTimes, setFixedTimes] = useState<string[]>(
    initial.fixedTimes.length ? initial.fixedTimes : ["08:00"],
  );
  const [everyDay, setEveryDay] = useState(initial.everyDay);
  const [days, setDays] = useState<number[]>(initial.days);
  const [intervalHours, setIntervalHours] = useState(initial.intervalHours || "8");
  const [anchorTime, setAnchorTime] = useState(initial.anchorTime || "06:00");
  const [prnReason, setPrnReason] = useState(initial.prnReason);
  const [prnMinHours, setPrnMinHours] = useState(initial.prnMinHours || "6");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(iso: number) {
    setDays((d) => (d.includes(iso) ? d.filter((x) => x !== iso) : [...d, iso]));
  }

  async function save() {
    setError(null);
    if (!name.trim()) {
      setError("El nombre no puede estar vacío.");
      return;
    }
    setSaving(true);
    const res = await updateMedication({
      medicationId,
      name,
      dose: dose ? Number(dose) : null,
      unit: unit || null,
      instructions: instructions || null,
      isActive,
      scheduleType,
      fixedTimes: scheduleType === "fixed" ? fixedTimes.filter(Boolean) : undefined,
      daysOfWeek:
        scheduleType === "fixed" && !everyDay && days.length > 0 ? days : null,
      intervalHours:
        scheduleType === "interval" ? Number(intervalHours) || null : null,
      anchorTime: scheduleType === "interval" ? anchorTime : null,
      prnReason: scheduleType === "prn" ? prnReason || null : null,
      prnMinHours:
        scheduleType === "prn" && prnMinHours ? Number(prnMinHours) : null,
    });
    setSaving(false);
    if (res.ok) {
      router.push("/medicamentos/gestionar");
      router.refresh();
    } else {
      setError(res.message ?? "No se pudo guardar.");
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          className={field}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            placeholder="Dosis"
            inputMode="decimal"
            className={field}
          />
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unidad"
            className={field}
          />
        </div>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Instrucciones (opcional)"
          rows={2}
          className="w-full rounded-xl border border-line p-3 text-base"
        />
        <label className="flex items-center gap-2 text-base text-ink/80">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-5 w-5"
          />
          Medicamento activo
        </label>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-medium text-ink/80">Frecuencia</p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["fixed", "Fijo"],
              ["interval", "Cada X h"],
              ["prn", "Según necesidad"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setScheduleType(value)}
              className={`min-h-touch rounded-xl border px-2 text-sm font-semibold ${
                scheduleType === value
                  ? "border-brand bg-brand-soft text-brand-dark"
                  : "border-line text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {scheduleType === "fixed" ? (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-1">
              {(
                [
                  ["1×/día", ["08:00"]],
                  ["2×/día", ["08:00", "20:00"]],
                  ["3×/día", ["08:00", "14:00", "20:00"]],
                  ["4×/día", ["06:00", "12:00", "18:00", "22:00"]],
                ] as const
              ).map(([label, preset]) => {
                const selected =
                  JSON.stringify(fixedTimes) === JSON.stringify(preset);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setFixedTimes([...preset])}
                    className={`min-h-touch rounded-lg border text-sm font-semibold ${
                      selected
                        ? "border-brand bg-brand-soft text-brand-dark"
                        : "border-line text-muted"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {fixedTimes.map((t, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="time"
                  value={t}
                  onChange={(e) =>
                    setFixedTimes((arr) =>
                      arr.map((v, j) => (j === i ? e.target.value : v)),
                    )
                  }
                  className={field}
                />
                {fixedTimes.length > 1 ? (
                  <Button
                    variant="secondary"
                    className="px-3"
                    onClick={() =>
                      setFixedTimes((arr) => arr.filter((_, j) => j !== i))
                    }
                  >
                    ✕
                  </Button>
                ) : null}
              </div>
            ))}
            <Button
              variant="ghost"
              onClick={() => setFixedTimes((arr) => [...arr, "12:00"])}
            >
              + Añadir hora
            </Button>

            <label className="flex items-center gap-2 text-base text-ink/80">
              <input
                type="checkbox"
                checked={everyDay}
                onChange={(e) => setEveryDay(e.target.checked)}
                className="h-5 w-5"
              />
              Todos los días
            </label>
            {!everyDay ? (
              <div className="flex gap-1">
                {DAYS.map((d) => (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => toggleDay(d.iso)}
                    className={`min-h-touch flex-1 rounded-lg border text-sm font-semibold ${
                      days.includes(d.iso)
                        ? "border-brand bg-brand-soft text-brand-dark"
                        : "border-line text-muted"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {scheduleType === "interval" ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-muted">Cada (horas)</label>
              <input
                value={intervalHours}
                onChange={(e) => setIntervalHours(e.target.value)}
                inputMode="numeric"
                className={field}
              />
            </div>
            <div>
              <label className="text-sm text-muted">Primera dosis</label>
              <input
                type="time"
                value={anchorTime}
                onChange={(e) => setAnchorTime(e.target.value)}
                className={field}
              />
            </div>
          </div>
        ) : null}

        {scheduleType === "prn" ? (
          <div className="space-y-2">
            <input
              value={prnReason}
              onChange={(e) => setPrnReason(e.target.value)}
              placeholder="Motivo (ej. dolor, fiebre)"
              className={field}
            />
            <div>
              <label className="text-sm text-muted">
                Mínimo entre dosis (horas)
              </label>
              <input
                value={prnMinHours}
                onChange={(e) => setPrnMinHours(e.target.value)}
                inputMode="numeric"
                className={field}
              />
            </div>
          </div>
        ) : null}
      </Card>

      {error ? <p className="text-sm text-status-late">{error}</p> : null}
      <Button className="w-full" onClick={save} disabled={saving}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </Button>
    </div>
  );
}
