"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createTask } from "@/app/(app)/actions/tasks";

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

export function NewTaskForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [everyDay, setEveryDay] = useState(true);
  const [days, setDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(iso: number) {
    setDays((d) => (d.includes(iso) ? d.filter((x) => x !== iso) : [...d, iso]));
  }

  async function save() {
    setError(null);
    if (!title.trim()) {
      setError("Escribe un título.");
      return;
    }
    setSaving(true);
    const res = await createTask({
      title,
      description: description || null,
      category: category || null,
      times: times.filter(Boolean),
      daysOfWeek: !everyDay && days.length > 0 ? days : null,
    });
    setSaving(false);
    if (res.ok) {
      router.push("/tareas");
      router.refresh();
    } else {
      setError(res.message ?? "No se pudo guardar.");
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título (ej. Cambio de posición)"
          className={field}
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Categoría (opcional, ej. higiene)"
          className={field}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción (opcional)"
          rows={2}
          className="w-full rounded-xl border border-line p-3 text-base"
        />
      </Card>

      <Card className="space-y-2">
        <p className="text-sm font-medium text-ink/80">Horas</p>
        {times.map((t, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="time"
              value={t}
              onChange={(e) =>
                setTimes((arr) => arr.map((v, j) => (j === i ? e.target.value : v)))
              }
              className={field}
            />
            {times.length > 1 ? (
              <Button
                variant="secondary"
                className="px-3"
                onClick={() => setTimes((arr) => arr.filter((_, j) => j !== i))}
              >
                ✕
              </Button>
            ) : null}
          </div>
        ))}
        <Button variant="ghost" onClick={() => setTimes((arr) => [...arr, "12:00"])}>
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
      </Card>

      {error ? <p className="text-sm text-status-late">{error}</p> : null}
      <Button className="w-full" onClick={save} disabled={saving}>
        {saving ? "Guardando…" : "Guardar tarea"}
      </Button>
    </div>
  );
}
