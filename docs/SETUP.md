# Developer setup

[Documentation index](../README.md#client-and-developer-documentation)

## Choose the environment

| Environment | Use | Database | Access |
|---|---|---|---|
| Local development | Developer evaluation and synthetic test data | Local D1 simulation in `.wrangler/state` | Loopback development gateway bypass, then institution login |
| Legacy private Site | Historical release, not the new hosting target | Previous provider-managed D1 | Previous authorized Sites access |
| Client-owned cloud | Future client production/staging | Client-owned D1 | Code prepared; requires actual account, secrets and Access configuration |

The third environment has not been deployed. Follow [private standalone deployment](CLOUDFLARE_DEPLOY.md) to configure the real account, resources and Access policy.

## Prerequisites

- Git access to the private repository. Repository permission is distinct from website permission.
- Node.js >=22.13. The tests use `node:sqlite` and native TypeScript loading; validation used Node 24.19.0.
- pnpm exactly 11.25.0, as pinned in `package.json`.
- A modern browser and a local writable working directory.
- For Linux shell helpers: Bash, `flock` and GNU `timeout`. Windows users should use WSL. The portable `pnpm install --frozen-lockfile` path does not require the managed Sites installer.
- Internet/package registry access for first installation. No Docker, Python server or external AI account is required.

Check versions:

```bash
node --version
git --version
pnpm --version
```

## Install

```bash
git clone https://github.com/aiwithsiddhesh/uniadapt-learning.git
cd uniadapt-learning
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
```

Use GitHub's normal authorized Git authentication. Do not place a token in the clone URL. Keep the dependency lockfile; do not run `npm ci`, because no npm lockfile is delivered. In ChatGPT's managed Sites environment, the platform-specific `npm run install:ci` helper is available; it is not the recommended client-machine installation path.

## Generate local configuration

```bash
pnpm setup:local
pnpm check:setup
```

`setup:local` writes a cryptographically random 64-character value to `.dev.vars` as `UNIADAPT_AUTH_SECRET`, with restrictive file permissions where supported. It prints no secret, preserves the session secret and adds a missing `UNIADAPT_BOOTSTRAP_TOKEN`. Read the local bootstrap token privately from `.dev.vars` for first-Admin setup. An existing empty/example value must be corrected locally; never reuse a production secret for development.

`check:setup` checks Node, installed framework tools, the local D1 binding, the secret's presence/minimum length and delivered migration files. It does not connect to a cloud provider, validate account access or prove the database is migrated.

Cloudflare's development runtime reads `.dev.vars`; the file is ignored by Git. `.dev.vars.example` contains blank credentials and an explicit development-only local-auth flag; it is safe to commit. Do not use frontend-prefixed environment variables for authentication secrets. See [Cloudflare local variables documentation](https://developers.cloudflare.com/workers/local-development/environment-variables/).

## Prepare the local database

```bash
pnpm db:migrate:local
pnpm db:check:local
```

The first command applies the nine `drizzle/*.sql` migrations in order through Wrangler's migration tracker. Repeating it applies only outstanding migrations. The second lists tables. Expect the 25 application tables listed in [Database](DATABASE.md), plus provider/migration metadata tables.

`wrangler.local.json` deliberately uses the same `DB` binding, database name and placeholder ID as `vite.config.ts`. Both use local persistence under `.wrangler/state`. The placeholder ID is for local simulation, not a real cloud database. Always keep `--local` on local administration commands.

No cloud account, paid database or remote D1 creation is needed for these commands. Stop the dev server before schema maintenance. Do not delete `.wrangler/state` if its data must be retained.

## Run and initialize

```bash
pnpm dev
```

Open the printed loopback URL, normally `http://localhost:5173`. Use **localhost**, not a LAN IP, public tunnel or shared preview: the private Worker bypasses its outer gateway only for loopback development requests.

1. Open the application directly. No Sites/ChatGPT identity or mock account is required.
2. Choose **Initialize your institution** when no institution exists.
3. Enter the local institution setup token from `.dev.vars`, Admin name/email and a password of at least 12 characters and at most 72 UTF-8 bytes.
4. Follow [Admin setup](USER_GUIDE.md#admin-first-time-setup), using synthetic Student records.
5. Sign out of the institution account before testing a different role. A role is assigned by Admin; there is no dashboard role selector.

Refresh the page and restart the server to confirm persistence. Your data stays in the local D1 simulation. The production database is not accessed by this procedure.

## Verify

```bash
pnpm test
pnpm typecheck
pnpm build
```

The current suite has 124 passing tests: 99 foundation/learning tests, seven standalone bootstrap/access tests and 18 managed-auth tests. `pnpm build` compiles the Worker/client bundle; it does not deploy. The [Testing guide](TESTING.md) separates automated evidence from remaining browser/client acceptance.

`pnpm start` runs the compiled production Worker locally. Production has no development gateway bypass; configured, verified Cloudflare Access tokens are required. Use `pnpm dev` for local product evaluation, and the standalone guide for private cloud deployment.

## Configuration reference

| Setting/file | Purpose | Required? |
|---|---|---|
| `UNIADAPT_AUTH_SECRET` | HMAC session signing; minimum 32 characters | Yes, server-side only |
| `DB` Worker binding | D1 database used by routes | Yes |
| `.dev.vars` | Local secret values | Local only |
| `wrangler.local.json` | Local migration/query configuration | For delivered local DB commands |
| `wrangler.json` | Standalone local/default Worker configuration | Yes; public and preview URLs disabled |
| `UNIADAPT_BOOTSTRAP_TOKEN` | Authorizes fresh institution initialization | Required until first Admin is created |
| `UNIADAPT_ACCESS_ISSUER`, `UNIADAPT_ACCESS_AUDIENCE`, `UNIADAPT_ALLOWED_EMAILS` | Verified Cloudflare Access and explicit private audience | Required in cloud production |
| `.openai/hosting.json` | Historical Site metadata | Not used by the standalone build |
| `.sites-runtime/execution-profile.json` | Checkout-local Sites execution choice | Optional; clean clones default to portable |
| AI provider variables | No code consumes an AI provider key | Not implemented |
| `UNIADAPT_LOCAL_AUTH=true` | Explicit local bcrypt development; never a cloud fallback | Development only |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Dedicated Supabase project and modern public API key | Required in cloud production |
| `SUPABASE_SECRET_KEY` | Server-only Supabase admin key | Cloudflare secret storage only |
| `DATABASE_URL` | No code consumes a Postgres/Supabase URL | Unsupported |

## Troubleshooting

| Symptom | Check / resolution |
|---|---|
| `node:sqlite` or `.ts` loading fails | Upgrade to supported Node; recorded version is 24.19.0 |
| pnpm lock/version failure | Use 11.25.0 and the committed lockfile; do not silently regenerate it |
| Storage unavailable / missing table | Run local migration and table checks; verify the binding and persistence directory match |
| Authentication not configured | Generate/configure session/bootstrap secrets in `.dev.vars`; restart the dev server |
| Private access 403/503 | Use `pnpm dev` on localhost locally; cloud production requires verified Access settings/token |
| 401 after login | Check the session cookie, actual origin and expiry; sign in again; use localhost and a supported browser |
| 403 editing another scope | Expected authorization unless Admin's assignment/reference setup is wrong |
| 409 saving or confirming a preview | Another operation changed the revision; reload and preview again |
| Student sees no plan | Check placement, active offerings, approved curriculum/bank, coverage eligibility, future exams and entered availability |
| CSV fails | Download the template, use hierarchy codes and semicolon-separated elective codes; inspect row reasons |
| Save returns 413 storage limit | Learning cache limit reached; see Operations; a cloud DB change alone does not raise the application limit |

## Validation boundary

Commands/configuration and helper behavior are checked during this handover. The existing business tests and production compilation are rerun. First installation on a completely new customer machine, visual browser flows, external cloud provisioning and standalone identity integration remain client/environment acceptance items. No remote database is created by preparing this guide.
