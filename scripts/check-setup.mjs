import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const file = name => fileURLToPath(new URL(name, root));
const checks = [];
const add = (label, ok) => checks.push({ label, ok });
const [major, minor] = process.versions.node.split('.').map(Number);
add('Node.js >= 22.13', major > 22 || major === 22 && minor >= 13);
add('Installed TypeScript, Vinext and Wrangler', ['typescript', 'vinext', 'wrangler'].every(n => existsSync(file(`node_modules/${n}/package.json`))));
try {
  const config = JSON.parse(readFileSync(file('wrangler.local.json'), 'utf8'));
  const db = config.d1_databases?.find(d => d.binding === 'DB');
  add('Local DB binding matches vite.config.ts', db?.database_name === 'site-creator-d1' && db?.database_id === '00000000-0000-4000-8000-000000000000' && db?.migrations_dir === 'drizzle');
} catch { add('Valid wrangler.local.json', false); }
try {
  const text = readFileSync(file('.dev.vars'), 'utf8');
  const secret = text.match(/^UNIADAPT_AUTH_SECRET\s*=\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '');
  add('Local authentication secret configured (value hidden)', Boolean(secret && secret.length >= 32));
} catch { add('Local .dev.vars exists', false); }
add('Seven delivered SQL migrations', readdirSync(file('drizzle')).filter(n => n.endsWith('.sql')).length >= 7);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.label}`);
console.log('Configuration check only: use db:check:local and /api/health to verify migrated storage and runtime behavior.');
if (checks.some(c => !c.ok)) process.exitCode = 1;
