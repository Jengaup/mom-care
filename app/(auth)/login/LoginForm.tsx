"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function signInWithMagicLink() {
    if (!email) {
      setError("Escribe tu correo primero.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError("No se pudo enviar el enlace. Intenta de nuevo.");
      return;
    }
    setMessage("Te enviamos un enlace de acceso a tu correo.");
  }

  return (
    <form onSubmit={signInWithPassword} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Correo
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-touch w-full rounded-xl border border-gray-300 px-4 text-base"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-touch w-full rounded-xl border border-gray-300 px-4 text-base"
        />
      </div>

      {error ? <p className="text-sm text-status-late">{error}</p> : null}
      {message ? <p className="text-sm text-status-done">{message}</p> : null}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Entrando…" : "Entrar"}
      </Button>

      <Button
        type="button"
        variant="secondary"
        disabled={loading}
        onClick={signInWithMagicLink}
        className="w-full"
      >
        Enviarme un enlace de acceso
      </Button>
    </form>
  );
}
