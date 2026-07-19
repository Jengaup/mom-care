# mom-care

App **privada** (login obligatorio) para que 3–4 cuidadores coordinen el cuidado
diario de un paciente encamado: medicamentos, tareas, citas, notas e historial —
sin olvidos, sin dosis duplicadas y con trazabilidad de quién hizo qué.

Pensada para un cuidador cansado usando el teléfono con una mano: **máximo 2 taps**
para las acciones frecuentes (marcar medicamento dado, completar tarea).

## Stack

- **Next.js** (App Router) + **TypeScript** strict + **Tailwind CSS**
- **Supabase**: Auth + Postgres + RLS (`@supabase/supabase-js` + `@supabase/ssr`)
- Server Components por defecto; mutaciones vía **Server Actions**
- Fechas con `date-fns` + `date-fns-tz`. Todo se guarda en UTC y se muestra en
  `America/Puerto_Rico` (AST, sin horario de verano).
- PWA: manifest + service worker propio (app shell cacheado, datos siempre desde red)
- Deploy en **Vercel**

## Decisiones clave

- **Ocurrencias calculadas, no materializadas**: los horarios se guardan como
  reglas (`medication_schedules`) y las dosis/tareas del día se derivan en lectura
  (`lib/occurrences.ts`). Solo se inserta un log cuando el cuidador marca algo.
  Sin cron, sin filas huérfanas.
- **Tres tipos de frecuencia**: `fixed` (hora fija), `interval` (cada X h desde una
  hora ancla, recalculado cada día) y `prn` (según necesidad, no ensucia pendientes).
- **Anti-doble-dosis**: índice único parcial `(patient_medication_id, scheduled_for)`
  para dosis programadas; los PRN (sin hora) sí pueden repetirse.
- **Historial inmutable**: nadie borra logs; las correcciones son solo de admin.
- **Activity feed por triggers de Postgres**: ninguna ruta puede olvidarse de
  registrar; el texto legible se compone en el front desde `action` + `metadata`.

## Requisitos

- Node 20+ y npm
- Docker (para el stack local de Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## Desarrollo local (Supabase CLI + Docker)

```bash
npm install

# 1) Levanta Postgres + Auth + Studio + Inbucket en Docker
supabase start

# 2) Aplica migraciones y seed (supabase db reset ejecuta migrations/ + seed.sql)
supabase db reset

# 3) Variables de entorno: copia .env.example a .env.local y pega las claves
#    que imprime `supabase start` (o `supabase status`)
cp .env.example .env.local

# 4) Genera los tipos de la base de datos
npm run db:types

# 5) Arranca la app
npm run dev
```

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key de `supabase status`>
SUPABASE_SERVICE_ROLE_KEY=<service_role key de `supabase status`>
```

> `SUPABASE_SERVICE_ROLE_KEY` es un secreto y **solo** se usa en el servidor
> (route handler de invitación). Nunca se expone al cliente.

### Correos de invitación en local

`inviteUserByEmail` envía un correo real. En local ese correo cae en **Inbucket**:
ábrelo en <http://127.0.0.1:54324>. No hace falta configurar SMTP para desarrollo.

### Credenciales de prueba (del seed)

| Rol | Correo | Contraseña |
|---|---|---|
| Admin | `admin@josealbertopr.com` | `momcare123` |
| Cuidador | `caregiver@josealbertopr.com` | `momcare123` |

### Verificación de RLS

Con el stack local corriendo:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/rls_verify.sql
```

Se autentica como caregiver e intenta 5 operaciones prohibidas; todas deben quedar
bloqueadas (imprime `PASS` en cada una y `RLS OK` al final).

## Producción (Supabase hosted)

El proyecto hosted se alimenta de **las mismas migraciones**:

```bash
supabase link --project-ref <tu-project-ref>
supabase db push        # aplica supabase/migrations/ al proyecto hosted
```

No corras el seed en producción (son datos de prueba). Configura, si quieres, un
SMTP real en el proyecto para que las invitaciones salgan de verdad.

## Deploy en Vercel

1. Importa el repositorio en Vercel.
2. Configura las variables de entorno del proyecto:
   - `NEXT_PUBLIC_SUPABASE_URL` (URL del proyecto hosted)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy.

### Dominio propio (`caregiver.josealbertopr.com`)

Esta app necesita servidor (Server Actions + Supabase), así que **no** puede vivir
en GitHub Pages. El dominio apunta a **Vercel**, no a GitHub:

1. En Vercel → Settings → Domains, añade `caregiver.josealbertopr.com`.
2. En el DNS de `josealbertopr.com`, crea el registro que Vercel te indique.
   Para un subdominio suele ser:

   | Tipo | Host | Valor |
   |---|---|---|
   | `CNAME` | `caregiver` | `cname.vercel-dns.com` |

   (Copia el valor exacto que muestre el panel de Vercel.)

## Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:types` | Regenera `types/database.ts` desde el stack local |
| `supabase db reset` | Recrea la BD local con migraciones + seed |
| `supabase db push` | Aplica migraciones al proyecto hosted |

## Estructura

```
app/
  (auth)/login/            login (password + enlace mágico)
  (app)/                   layout con sesión + nav inferior
    page.tsx               dashboard de hoy
    medicamentos/          lista de hoy + alta (admin)
    tareas/  citas/  notas/  historial/  configuracion/
    actions/               Server Actions por dominio
  api/invite/              route handler de invitación (service role)
  auth/callback/           intercambio de código del enlace mágico
components/                ui/ medications/ tasks/ appointments/ notes/ activity/ settings/
lib/
  supabase/{client,server,middleware}.ts
  time.ts                  zona horaria (APP_TIMEZONE) y scheduled_for
  occurrences.ts           cálculo de ocurrencias y estados
  today.ts / dto.ts        carga y mapeo de "hoy"
  activity.ts              texto legible del feed
  auth.ts / patient.ts / status.ts
types/database.ts          tipos de la BD (regenerables)
supabase/
  migrations/  seed.sql  rls_verify.sql  config.toml
public/                    manifest.webmanifest, sw.js, icons/
```

## Deuda técnica conocida

- **Editar un horario con logs previos**: los logs son inmutables, así que un
  cambio de hora puede dejar un log "huérfano" respecto a la nueva ocurrencia
  derivada (aparece en historial, no empareja la ocurrencia de hoy). Solución
  real: versionar horarios (`valid_from`/`valid_to`). Fuera del MVP.
- **Sin cola offline** (por diseño, spec 3.10): sin red no se registra y se avisa;
  no se finge un guardado.
- `types/database.ts` se escribió a mano por falta de Docker en el entorno de
  build; regenerable con `npm run db:types` cuando el stack local esté disponible.
