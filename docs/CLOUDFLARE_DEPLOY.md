# Private standalone hosting from GitHub

**Target:** GitHub source → Cloudflare Workers application → client-owned D1, with owner-only Cloudflare Access. This code no longer requires ChatGPT Sites headers or sign-in. **Cloud deployment status: not deployed; client Cloudflare account access and resource configuration are required.**

GitHub Pages is static hosting and cannot execute the Worker APIs, D1 transactions or server-side account authentication. GitHub Actions or Cloudflare's Git integration can deploy the source to a compute host; they are not that host themselves. A GitHub Codespace is a temporary development machine/preview, not an always-on production deployment.

## Resources and cost decision

You need one authorized Cloudflare account, one D1 database and one Access application/policy. No paid domain is required for an initial private `workers.dev` endpoint. Institutional passwords/JWTs are handled by the application; Access separately restricts who can reach it.

Workers Paid currently has a $5/month minimum plus applicable usage. Workers Free permits only 10 ms CPU/request. This app performs bcrypt cost-10 password hashing and substantial domain/planning work, so this guide plans for Paid rather than claiming it fits Free. Local timing is not a deployed CPU benchmark; validate real Worker CPU and database usage before client rollout. The account owner must approve/select any paid plan; no plan purchase or cloud resource creation was performed while preparing this source.

See [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [CPU limits](https://developers.cloudflare.com/workers/platform/limits/), [private workers.dev access](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/) and [Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).

## 1. Provision a new database

Use the account owner's authorized workstation:

```bash
pnpm exec wrangler login
pnpm exec wrangler whoami
pnpm exec wrangler d1 create uniadapt-staging
```

Copy **`wrangler.json`** to ignored **`wrangler.client.json`** at the repository root. Replace the D1 name and ID with the returned values. Keep binding `DB`, main `build/uniadapt-worker.ts`, migrations directory `drizzle`, `assets.run_worker_first: true`, `workers_dev: false` and `preview_urls: false`. Do not use the database-only template as an application deployment config.

```bash
pnpm exec wrangler d1 migrations apply DB --remote --config wrangler.client.json
```

This creates a fresh environment. It does not move or delete data from the old private Site. Existing institutional records require a separate authorized full export/import, with IDs/history and backup validation.

## 2. Build and upload without a visitor URL

After tests/typecheck:

```bash
UNIADAPT_DEPLOY_CONFIG=wrangler.client.json pnpm build
pnpm check:deployment -- --upload-only
pnpm exec wrangler deploy --config dist/server/wrangler.json
```

`check:deployment` reads the **generated** artifact config, verifies a real D1 ID, disabled previews and Worker-first assets. Initial upload additionally requires `workers_dev=false`. The Worker resource can then be configured while its default URL remains disabled. Never deploy the default local-placeholder artifact.

## 3. Configure the two server secrets

Through the authorized Cloudflare secret interface/CLI, set independent random values of at least 32 characters:

```bash
pnpm exec wrangler secret put UNIADAPT_AUTH_SECRET --config wrangler.client.json
pnpm exec wrangler secret put UNIADAPT_BOOTSTRAP_TOKEN --config wrangler.client.json
```

The CLI securely prompts for values; do not put them in Git or command-line arguments. Store the bootstrap token privately for first-Admin initialization. `UNIADAPT_AUTH_SECRET` signs the four-hour institution sessions. The bootstrap token is checked only while no institution root exists; subsequent initialization is blocked. Remove/rotate it after initialization as appropriate, retaining an agreed recovery plan.

## 4. Configure owner-only Cloudflare Access

Follow Cloudflare's **Manage access to workers.dev** procedure for the Worker's production endpoint. Create an Access policy allowing only the authorized owner's email; do not select Everyone, Bypass or an unapproved group. Keep preview URLs disabled. Copy the application's issuer/team origin and Audience (AUD) tag exactly from the account.

Set these non-secret server settings in `wrangler.client.json.vars`:

```json
{
  "UNIADAPT_ACCESS_ISSUER": "https://YOUR_TEAM.cloudflareaccess.com",
  "UNIADAPT_ACCESS_AUDIENCE": "YOUR_EXACT_ACCESS_APPLICATION_AUD",
  "UNIADAPT_ALLOWED_EMAILS": "YOUR_AUTHORIZED_OWNER_EMAIL"
}
```

The issuer must be the canonical HTTPS team origin without a trailing slash/path. The Worker verifies Access signature, issuer, audience, expiry and the explicit email allowlist using `jose`; an arbitrary header or institution JWT cannot bypass this gate. Requests for HTML, APIs and static assets all pass through it. Missing settings fail closed; missing/invalid/unapproved Access tokens return 403. Development bypass exists only for loopback requests in a development build.

Rebuild with `UNIADAPT_DEPLOY_CONFIG=wrangler.client.json`, run `pnpm check:deployment`, and redeploy the private artifact. Enable the production `workers.dev` route only with the owner-only Access policy in place. Keep `workers_dev` consistent in the private client config for future deployments; previews must remain false. A route enabled without Access cannot serve application content because the Worker independently requires a verified allowed Access token.

## 5. Initialize and verify

Use the actual private URL returned by the account's deployment interface. Pass Cloudflare Access as the allowed owner, then:

1. Open `/` and confirm the UniAdapt sign-in page without a ChatGPT redirect.
2. If the database is fresh, enter Admin name/email, password and the private `UNIADAPT_BOOTSTRAP_TOKEN` in **Initialize your institution**.
3. Confirm first Admin creation, restart/reload persistence, sign-out/login and Admin academic controls.
4. Create synthetic Teacher/Student accounts and verify their institutional role boundaries.
5. Verify `/api/health` through Access and a 401 from protected domain routes without an institution session.
6. Try an incognito/unauthorized identity: it must not receive HTML/app assets, health or domain data. Test actual Access token expiry/revocation and alternative URL/preview exposure.
7. Record commit, generated config, DB/migration state, account Access policy, runtime CPU/latency and test results.

No real Cloudflare URL, policy, cost benchmark or client account acceptance is recorded yet. An operator must complete these steps before the deployment can be called working/private.

## GitHub-driven updates

Once initial resource/secret/Access setup is complete, the owner can configure Cloudflare's Git integration or an approved GitHub Actions workflow to run locked installation, tests, typecheck, a client-configured build and the deployment check before publishing. Use provider/GitHub secret stores and restrict deployment permissions to the selected account/Worker. GitHub repo access does not automatically grant app Access.

No deployment workflow or cloud credentials are enabled automatically in this repository. Never publish GitHub Pages as a substitute for the backend or expose the private port/application publicly without approval.
