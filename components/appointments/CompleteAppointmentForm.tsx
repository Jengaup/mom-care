"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { completeAppointment } from "@/app/(app)/actions/appointments";

const field = "w-full rounded-xl border border-line p-3 text-base";

export function CompleteAppointmentForm({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [medicationChanges, setMedicationChanges] = useState("");
  const [nextAppointmentAt, setNextAppointmentAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await completeAppointment({
      appointmentId,
      summary,
      nextSteps,
      medicationChanges,
      nextAppointmentAtISO: nextAppointmentAt
        ? new Date(nextAppointmentAt).toISOString()
        : null,
    });
    setSaving(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(res.message ?? "No se pudo guardar.");
    }
  }

  if (!open) {
    return (
      <Button className="w-full" onClick={() => setOpen(true)}>
        Marcar como completada
      </Button>
    );
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold text-ink">Notas de la cita</h2>
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="Resumen"
        rows={3}
        className={field}
      />
      <textarea
        value={nextSteps}
        onChange={(e) => setNextSteps(e.target.value)}
        placeholder="Próximos pasos"
        rows={2}
        className={field}
      />
      <textarea
        value={medicationChanges}
        onChange={(e) => setMedicationChanges(e.target.value)}
        placeholder="Cambios en medicamentos"
        rows={2}
        className={field}
      />
      <div>
        <label className="text-sm text-muted">Próxima cita (opcional)</label>
        <input
          type="datetime-local"
          value={nextAppointmentAt}
          onChange={(e) => setNextAppointmentAt(e.target.value)}
          className="min-h-touch w-full rounded-xl border border-line px-4 text-base"
        />
      </div>
      {error ? <p className="text-sm text-status-late">{error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </Card>
  );
}
