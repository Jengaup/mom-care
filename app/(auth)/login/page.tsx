import { LoginForm } from "./LoginForm";

// No pre-generar en build: el cliente de Supabase necesita las variables de
// entorno, que solo existen en runtime. Se renderiza bajo demanda.
export const dynamic = "force-dynamic";

export default function LoginPage() {
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
