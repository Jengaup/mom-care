import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

// No pre-generar en build: el cliente de Supabase necesita las variables de
// entorno, que solo existen en runtime. Se renderiza bajo demanda.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Si ya hay sesión, al dashboard. Antes lo hacía el middleware.
  // Tolerante a fallos: si la config no está lista, mostramos el login igual.
  try {
    const user = await getSessionUser();
    if (user) redirect("/");
  } catch (err) {
    // `redirect` lanza internamente un NEXT_REDIRECT que hay que dejar pasar.
    if (err && typeof err === "object" && "digest" in err) throw err;
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-status-done">mom-care</h1>
        <p className="mt-1 text-gray-500">Cuidado coordinado, sin olvidos</p>
      </div>
      <LoginForm />
    </div>
  );
}
