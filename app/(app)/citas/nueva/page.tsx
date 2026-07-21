import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { NewAppointmentForm } from "@/components/appointments/NewAppointmentForm";

export const dynamic = "force-dynamic";

export default async function NuevaCitaPage() {
  await requireRole("admin");

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href="/citas" className="text-2xl" aria-label="Volver">
          ‹
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nueva cita</h1>
      </header>
      <NewAppointmentForm />
    </div>
  );
}
