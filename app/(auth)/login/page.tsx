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
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-10 text-center">
        <span
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-3xl shadow-card"
          aria-hidden
        >
          🤍
        </span>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-brand-dark">
          mom-care
        </h1>
        <p className="mt-2 text-muted">Cuidado coordinado, sin olvidos.</p>
      </div>
      <LoginForm />
      <p className="mt-8 text-center text-sm text-muted">
        Entra con tu correo y contraseña para continuar.
      </p>
    </div>
  );
}
