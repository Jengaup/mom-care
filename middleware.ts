import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Node.js runtime: el cliente de Supabase (@supabase/ssr) arrastra módulos que
  // el Edge Runtime no soporta. En Node corre sin restricciones.
  runtime: "nodejs",
  // Protege todo excepto assets estáticos, imágenes y archivos de PWA.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
