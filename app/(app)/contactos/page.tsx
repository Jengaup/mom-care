import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ContactsManager,
  type Contact,
  type EmergencyInfo,
} from "@/components/contacts/ContactsManager";

export const dynamic = "force-dynamic";

export default async function ContactosPage() {
  const user = await getSessionUser();
  const patient = await getActivePatient();
  if (!patient) return <EmptyState title="No hay un paciente activo." />;
  const supabase = await createClient();

  const [{ data: contacts }, { data: p }] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, name, role, phone, note, is_emergency")
      .eq("patient_id", patient.id)
      .order("is_emergency", { ascending: false })
      .order("sort_order")
      .order("name"),
    supabase
      .from("patients")
      .select("blood_type, allergies, conditions, insurance, emergency_note")
      .eq("id", patient.id)
      .maybeSingle(),
  ]);

  const info: EmergencyInfo = {
    bloodType: p?.blood_type ?? null,
    allergies: p?.allergies ?? null,
    conditions: p?.conditions ?? null,
    insurance: p?.insurance ?? null,
    emergencyNote: p?.emergency_note ?? null,
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-2xl" aria-label="Volver">
          ‹
        </Link>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Contactos
        </h1>
      </header>
      <ContactsManager
        contacts={(contacts ?? []) as Contact[]}
        info={info}
        isAdmin={user?.role === "admin"}
      />
    </div>
  );
}
