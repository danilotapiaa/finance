# Serene Finance

Aplicación de finanzas personales construida con React 19, TypeScript, Vite y Supabase. Se instala como PWA y funciona en móvil y escritorio.

## Requisitos

- Node 22 o superior
- Una instancia de Supabase con el esquema de `supabase_schema.sql`

## Configuración

Copia `.env.example` a `.env` y completa las credenciales del proyecto:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Scripts

- `npm run dev`: servidor de desarrollo
- `npm run build`: comprobación de tipos y build de producción
- `npm test`: suite de Vitest
- `npm run test:coverage`: cobertura
- `npm run lint`: oxlint
- `npm run types`: regenera los tipos de la base de datos desde el esquema real

## Tipos de base de datos

`src/types/database.ts` se mantiene a mano. `npm run types` genera `src/types/supabase.ts` a partir del proyecto de Supabase y requiere `SUPABASE_ACCESS_TOKEN` en `.env` o haber ejecutado `npx supabase login`. La migración de imports al archivo generado puede hacerse de forma incremental.

## Integración continua

`.github/workflows/ci.yml` ejecuta lint, comprobación de tipos, tests y build en cada push y pull request.
