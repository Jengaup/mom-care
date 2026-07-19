import { BottomNav } from "@/components/ui/BottomNav";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Barrera de sesión a nivel de servidor (además del middleware).
  await requireUser();

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <OfflineBanner />
      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
