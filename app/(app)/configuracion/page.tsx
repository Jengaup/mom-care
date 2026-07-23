import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { getActivePatient, getLinkedPatients } from "@/lib/patient";
import { createClient } from "@/lib/supabase/server";
import { TEXT_SIZE_COOKIE } from "@/lib/prefs";
import { EmptyState } from "@/components/ui/EmptyState";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { PatientsCard } from "@/components/settings/PatientsCard";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const user = await getSessionUser();
  const patient = await getActivePatient();
  if (!user) {
    return <EmptyState title="Sesión no válida." />;
  }

  const supabase = await createClient();
  const linkedPatients = await getLinkedPatients();
  const cookieStore = await cookies();
  const textLarge = cookieStore.get(TEXT_SIZE_COOKIE)?.value === "lg";

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  let caregivers: {
    id: string;
    full_name: string | null;
    role: "admin" | "caregiver";
  }[] = [];
  if (patient) {
    const { data: links } = await supabase
      .from("caregiver_patients")
      .select("profile_id")
      .eq("patient_id", patient.id);
    const ids = (links ?? []).map((l) => l.profile_id);
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("id", ids)
        .order("full_name");
      caregivers = profs ?? [];
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold text-ink">Configuración</h1>
      <a
        href="/reporte"
        className="min-h-touch flex items-center justify-between rounded-2xl border border-line bg-white px-4 font-semibold text-ink"
      >
        <span>📄 Reporte del paciente</span>
        <span className="text-muted">›</span>
      </a>
      <a
        href="/contactos"
        className="min-h-touch flex items-center justify-between rounded-2xl border border-line bg-white px-4 font-semibold text-ink"
      >
        <span>📇 Contactos y emergencia</span>
        <span className="text-muted">›</span>
      </a>
      <a
        href="/signos"
        className="min-h-touch flex items-center justify-between rounded-2xl border border-line bg-white px-4 font-semibold text-ink"
      >
        <span>❤️ Signos vitales</span>
        <span className="text-muted">›</span>
      </a>
      <a
        href="/documentos"
        className="min-h-touch flex items-center justify-between rounded-2xl border border-line bg-white px-4 font-semibold text-ink"
      >
        <span>📎 Documentos y fotos</span>
        <span className="text-muted">›</span>
      </a>
      {patient ? (
        <PatientsCard
          patients={linkedPatients}
          activeId={patient.id}
          active={{
            id: patient.id,
            full_name: patient.full_name,
            birth_date: patient.birth_date,
            notes: patient.notes,
          }}
          isAdmin={user.role === "admin"}
        />
      ) : null}
      <SettingsClient
        me={{
          id: user.id,
          fullName: profile?.full_name ?? "",
          phone: profile?.phone ?? "",
        }}
        isAdmin={user.role === "admin"}
        graceMinutes={patient?.grace_minutes ?? 60}
        caregivers={caregivers}
        textLarge={textLarge}
      />
    </div>
  );
}
