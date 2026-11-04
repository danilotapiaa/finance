import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const loadEnv = () => {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return {};

  return Object.fromEntries(
    readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, '');
        return [key, value];
      })
  );
};

const env = { ...loadEnv(), ...process.env };
const accessToken = env.SUPABASE_ACCESS_TOKEN;
const supabaseUrl = env.VITE_SUPABASE_URL;

if (!accessToken) {
  console.error(
    'Falta SUPABASE_ACCESS_TOKEN. Ejecuta "npx supabase login" o exporta el token antes de generar los tipos.'
  );
  process.exit(1);
}

if (!supabaseUrl) {
  console.error('Falta VITE_SUPABASE_URL en el archivo .env.');
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    '--yes',
    'supabase@3',
    'gen',
    'types',
    'typescript',
    '--project-id',
    projectRef,
    '--schema',
    'public',
  ],
  {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken },
    stdio: ['ignore', 'pipe', 'inherit'],
  }
);

if (result.status !== 0) {
  console.error('No se pudieron generar los tipos de Supabase.');
  process.exit(result.status ?? 1);
}

const outputPath = resolve(root, 'src/types/supabase.ts');
const header =
  '// Archivo generado por "npm run types". No lo edites a mano.\n' +
  '// Ejecuta "npm run types" tras cada cambio en el esquema de Supabase.\n\n';

writeFileSync(outputPath, header + result.stdout, 'utf8');
console.log(`Tipos generados en ${outputPath}`);
