"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import {
  rescheduleAppointment,
  cancelAppointment,
} from "@/app/(app)/actions/appointments";

export function AppointmentAdminActions({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const router = useRouter();
  const [reOpen, setReOpen] = useState(false);
  const [when, setWhen] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doReschedule() {
    setError(null);
    if (!when) {
      setError("Elige fecha y hora.");
      return;
    }
    setBusy(true);
    const res = await rescheduleAppointment({
      appointmentId,
      scheduledAtLocal: when,
    });
    setBusy(false);
    if (res.ok) {
      setReOpen(false);
      router.refresh();
    } else {
      setError(res.message ?? "No se pudo reprogramar.");
    }
  }

  async function doCancel() {
    setBusy(true);
    await cancelAppointment(appointmentId);
    setBusy(false);
    setConfirmCancel(false);
    router.refresh();
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => setReOpen(true)}>
          Reprogramar
        </Button>
        <Button variant="secondary" onClick={() => setConfirmCancel(true)}>
          Cancelar cita
        </Button>
      </div>

      <Sheet open={reOpen} onClose={() => setReOpen(false)} title="Reprogramar cita">
        <Card className="space-y-3 border-0 p-0 shadow-none">
          <label className="text-sm text-muted">Nueva fecha y hora</label>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="min-h-touch w-full rounded-xl border border-line px-4 text-base"
          />
          {error ? <p className="text-sm text-status-late">{error}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setReOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={doReschedule} disabled={busy}>
              Guardar
            </Button>
          </div>
        </Card>
      </Sheet>

      <Sheet
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancelar cita"
      >
        <div className="space-y-3">
          <p className="text-base text-muted">
            ¿Marcar esta cita como cancelada? Quedará en el historial.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
              No
            </Button>
            <Button variant="danger" onClick={doCancel} disabled={busy}>
              Sí, cancelar
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
