"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  searchCatalog,
  createCatalogEntry,
  createMedication,
  type NewMedicationInput,
} from "@/app/(app)/actions/meds";

type CatalogItem = { id: string; name: string; default_unit: string | null };
type ScheduleType = "fixed" | "interval" | "prn";

const DAYS = [
  { iso: 1, label: "L" },
  { iso: 2, label: "M" },
  { iso: 3, label: "X" },
  { iso: 4, label: "J" },
  { iso: 5, label: "V" },
  { iso: 6, label: "S" },
  { iso: 7, label: "D" },
];

const field = "min-h-touch w-full rounded-xl border border-gray-300 px-4 text-base";

export function NewMedicationForm() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [manual, setManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualUnit, setManualUnit] = useState("");

  // Medicamento seleccionado
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [unit, setUnit] = useState("");
  const [instructions, setInstructions] = useState("");

  // Frecuencia
  const [scheduleType, setScheduleType] = useState<ScheduleType>("fixed");
  const [fixedTimes, setFixedTimes] = useState<string[]>(["08:00"]);
  const [everyDay, setEveryDay] = useState(true);
  const [days, setDays] = useState<number[]>([]);
  const [intervalHours, setIntervalHours] = useState("8");
  const [anchorTime, setAnchorTime] = useState("06:00");
  const [prnReason, setPrnReason] = useState("");
  const [prnMinHours, setPrnMinHours] = useState("6");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    setSearching(true);
    setResults(await searchCatalog(query));
    setSearching(false);
  }

  function selectCatalog(item: CatalogItem) {
    setCatalogId(item.id);
    setName(item.name);
    setUnit(item.default_unit ?? "");
    setManual(false);
  }

  async function addManual() {
    if (!manualName.trim()) return;
    const created = await createCatalogEntry(manualName, manualUnit || null);
    if (created) selectCatalog(created);
    setManualName("");
    setManualUnit("");
  }

  function toggleDay(iso: number) {
    setDays((d) => (d.includes(iso) ? d.filter((x) => x !== iso) : [...d, iso]));
  }

  async function save() {
    setError(null);
    if (!name.trim()) {
      setError("Selecciona o añade un medicamento.");
      return;
    }
    const input: NewMedicationInput = {
      catalogId,
      name,
      dose: dose ? Number(dose) : null,
      unit: unit || null,
      instructions: instructions || null,
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
    };
    setSaving(true);
    const res = await createMedication(input);
    setSaving(false);
    if (res.ok) {
      router.push("/medicamentos");
      router.refresh();
    } else {
      setError(res.message ?? "No se pudo guardar.");
    }
  }

  const hasMed = name.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Paso 1: catálogo */}
      {!hasMed ? (
        <Card className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            Buscar medicamento
          </label>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Ej. Acetaminofén"
              className={field}
            />
            <Button variant="secondary" onClick={runSearch} disabled={searching}>
              Buscar
            </Button>
          </div>

          <ul className="divide-y divide-gray-100">
            {results.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => selectCatalog(item)}
                  className="min-h-touch flex w-full items-center justify-between px-1 text-left text-base"
                >
                  <span>{item.name}</span>
                  <span className="text-sm text-gray-400">
                    {item.default_unit}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {!manual ? (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setManual(true)}
            >
              No está en la lista — añadir manualmente
            </Button>
          ) : (
            <div className="space-y-2 rounded-xl bg-gray-50 p-3">
              <input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Nombre del medicamento"
                className={field}
              />
              <input
                value={manualUnit}
                onChange={(e) => setManualUnit(e.target.value)}
                placeholder="Unidad (ej. mg)"
                className={field}
              />
              <Button className="w-full" onClick={addManual}>
                Añadir y continuar
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-gray-900">{name}</p>
            <button
              className="text-sm text-status-late"
              onClick={() => {
                setName("");
                setCatalogId(null);
              }}
            >
              Cambiar
            </button>
          </div>
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
            className="w-full rounded-xl border border-gray-300 p-3 text-base"
          />
        </Card>
      )}

      {/* Paso 2: frecuencia */}
      {hasMed ? (
        <Card className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Frecuencia</p>
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
                onClick={() => setScheduleType(value)}
                className={`min-h-touch rounded-xl border px-2 text-sm font-semibold ${
                  scheduleType === value
                    ? "border-status-done bg-green-50 text-status-done"
                    : "border-gray-300 text-gray-600"
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
                          ? "border-status-done bg-green-50 text-status-done"
                          : "border-gray-300 text-gray-600"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400">
                Elige una frecuencia o ajusta las horas manualmente.
              </p>
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

              <label className="flex items-center gap-2 text-base text-gray-700">
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
                      onClick={() => toggleDay(d.iso)}
                      className={`min-h-touch flex-1 rounded-lg border text-sm font-semibold ${
                        days.includes(d.iso)
                          ? "border-status-done bg-green-50 text-status-done"
                          : "border-gray-300 text-gray-500"
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
                <label className="text-sm text-gray-600">Cada (horas)</label>
                <input
                  value={intervalHours}
                  onChange={(e) => setIntervalHours(e.target.value)}
                  inputMode="numeric"
                  className={field}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Primera dosis</label>
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
                <label className="text-sm text-gray-600">
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
      ) : null}

      {error ? <p className="text-sm text-status-late">{error}</p> : null}

      {hasMed ? (
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Guardar medicamento"}
        </Button>
      ) : null}
    </div>
  );
}
