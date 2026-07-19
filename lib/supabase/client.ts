import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/** Cliente de Supabase para componentes cliente. Solo usa claves públicas. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
