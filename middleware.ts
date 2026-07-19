import { NextResponse, type NextRequest } from "next/server";

/**
 * Guardia de rutas ligero: solo mira si existe la cookie de sesión de Supabase
 * para decidir el redirect. Sin cliente de Supabase, sin variables de entorno,
 * sin módulos de Node → corre en Edge sin poder fallar.
 *
 * La verificación real de la sesión (token válido) la hace el layout del grupo
 * (app) en el servidor con `requireUser()`, que redirige a /login si no vale.
 */
function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/auth");
  const authed = hasAuthCookie(request);

  if (!authed && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (authed && path.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Protege todo excepto assets estáticos, imágenes y archivos de PWA.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
