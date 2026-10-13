import { randomBytes } from 'node:crypto';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Local development only; never contacts a provider or changes an existing secret.
const file = fileURLToPath(new URL('../.dev.vars', import.meta.url));
try {
  writeFileSync(file, `# Local development only. Do not commit this file.\nUNIADAPT_AUTH_SECRET=${randomBytes(32).toString('hex')}\n`, { flag: 'wx', mode: 0o600 });
  console.log('Created .dev.vars with a random local authentication secret. No secret value was printed.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  const text = readFileSync(file, 'utf8');
  const match = text.match(/^UNIADAPT_AUTH_SECRET\s*=\s*(.+)$/m);
  if (!match || match[1].trim().replace(/^['"]|['"]$/g, '').length < 32) {
    console.error('Existing .dev.vars was preserved. Configure UNIADAPT_AUTH_SECRET with at least 32 characters before continuing.');
    process.exitCode = 1;
  } else console.log('Existing .dev.vars was preserved.');
}
