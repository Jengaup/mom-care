import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getActivePatient } from "@/lib/patient";

/**
 * Invitación de cuidadores (spec 3.9). Solo admin. Usa service role
 * (inviteUserByEmail) y vincula al nuevo usuario con el paciente activo.
 * SUPABASE_SERVICE_ROLE_KEY solo vive aquí, en el servidor.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
  } | null;
  const email = body?.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Falta el correo" }, { status: 400 });
  }

  const patient = await getActivePatient();
  if (!patient) {
    return NextResponse.json(
      { error: "No hay paciente activo" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const origin = request.nextUrl.origin;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback`,
  });
  if (error || !data?.user) {
    return NextResponse.json(
      { error: error?.message ?? "No se pudo invitar" },
      { status: 400 },
    );
  }

  // Vincular al paciente (bypass RLS con service role; el trigger ya creó el perfil).
  const { error: linkError } = await admin
    .from("caregiver_patients")
    .insert({ profile_id: data.user.id, patient_id: patient.id })
    .select()
    .maybeSingle();
  if (linkError && linkError.code !== "23505") {
    return NextResponse.json({ error: "Invitado, pero no se pudo vincular al paciente" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
