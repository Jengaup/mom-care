import { BottomNav } from "@/components/ui/BottomNav";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { PatientHeader } from "@/components/ui/PatientHeader";
import { requireUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Barrera de sesión a nivel de servidor (además del middleware).
  await requireUser();
  const patient = await getActivePatient();

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <OfflineBanner />
      {patient ? (
        <PatientHeader name={patient.full_name} birthDate={patient.birth_date} />
      ) : null}
      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
