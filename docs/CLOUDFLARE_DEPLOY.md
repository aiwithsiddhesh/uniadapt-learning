# Private standalone hosting from GitHub

**Target:** GitHub source → Cloudflare Workers application → client-owned D1, with owner-only Cloudflare Access. This code no longer requires ChatGPT Sites headers or sign-in. **Cloud deployment status: not deployed; client Cloudflare account access and resource configuration are required.**

Dashboard instructions and provider prices were checked against official Cloudflare documentation on **13 October 2026**. The commands match this repository. They have not yet been executed against a client Cloudflare account; provider deployment and browser acceptance remain pending.

If you are setting up the account for a maintainer to deploy, complete **steps 1–3** first. Steps **4–10** cover the application deployment. Creating an account does not automatically provide access to the maintainer's execution environment; arrange authenticated access through the approved account/browser workflow. Do not send passwords, OTPs, recovery codes or API tokens in chat or GitHub issues.

## Contents

- [Resources and cost decision](#resources-and-cost-decision)
- [1. Create your Cloudflare account](#1-create-your-cloudflare-account)
- [2. Prepare Workers hosting and billing](#2-prepare-workers-hosting-and-billing)
- [3. Set up Zero Trust and the website login method](#3-set-up-zero-trust-and-the-website-login-method)
- [4. Prepare your computer and authenticate Wrangler](#4-prepare-your-computer-and-authenticate-wrangler)
- [5. Create D1 and configure the application](#5-create-d1-and-configure-the-application)
- [6. Build and upload with the visitor URL disabled](#6-build-and-upload-with-the-visitor-url-disabled)
- [7. Configure the two server secrets](#7-configure-the-two-server-secrets)
- [8. Protect the Worker and configure Access settings](#8-protect-the-worker-and-configure-access-settings)
- [9. Enable the protected URL and initialize UniAdapt](#9-enable-the-protected-url-and-initialize-uniadapt)
- [10. Verify the deployment](#10-verify-the-deployment)
- [Updates, troubleshooting and handover](#updates-troubleshooting-and-handover)

GitHub Pages is static hosting and cannot execute the Worker APIs, D1 transactions or server-side account authentication. GitHub Actions or Cloudflare's Git integration can deploy the source to a compute host; they are not that host themselves. A GitHub Codespace is a temporary development machine/preview, not an always-on production deployment.

## Resources and cost decision

You need one authorized Cloudflare account, one Worker, one D1 database and one Access application/policy. No paid domain is required for an initial private `workers.dev` endpoint. Institutional passwords/JWTs are handled by the application; Access separately restricts who can reach it.

Workers Paid currently has a $5/month minimum plus applicable usage. Workers Free permits only 10 ms CPU/request. This app performs bcrypt cost-10 password hashing and substantial domain/planning work, so this guide plans for Paid rather than claiming it fits Free. Local timing is not a deployed CPU benchmark; validate real Worker CPU and database usage before client rollout. The account owner must approve/select any paid plan; no plan purchase or cloud resource creation was performed while preparing this source.

See [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [CPU limits](https://developers.cloudflare.com/workers/platform/limits/), [private workers.dev access](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/) and [Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).

| Resource | Purpose | Initial setup |
|---|---|---|
| Workers Paid | Runs the UI, APIs and password authentication | $5/month minimum plus applicable usage; selected by the account owner |
| D1 | Stores accounts and application records | Included usage allowances; usage above the allowance can add charges |
| Zero Trust Free / Access | Restricts website visitors to approved identities | Select Free during Zero Trust onboarding; payment details are still requested |
| `workers.dev` hostname | Provides the first URL | Use the account subdomain; no domain purchase needed |
| GitHub repository | Stores source and documentation | Existing private repository; initial deployment uses Wrangler |

Hosting does not enable the pending AI functionality. No AI API provider is required for this foundation deployment. See [roadmap](ROADMAP.md) for what is still planned.

## 1. Create your Cloudflare account

1. Open [Cloudflare sign-up](https://dash.cloudflare.com/sign-up) on your computer.
2. Register using the email that should own the hosting account and verify the email.
3. Sign in to [the dashboard](https://dash.cloudflare.com/), select the intended account and enable two-factor authentication.
4. For this initial deployment, continue to Workers rather than adding a custom website/domain. A `workers.dev` hostname is sufficient.
5. Keep the account name and account ID in the private deployment record. If several accounts appear, use the same selected account throughout.

**Expected result:** You can open the intended account's dashboard. No UniAdapt application has been deployed at this stage.

## 2. Prepare Workers hosting and billing

1. Open **Workers & Pages** in the selected account.
2. Review the account's Workers subscription and follow the upgrade option for **Workers Paid** when you are ready to incur its charge. This is the Workers subscription, separate from a domain/website plan.
3. Review the minimum charge and usage rates before confirming. This build is planned for Paid because its bcrypt authentication cannot be assumed to fit Free's 10 ms CPU limit. Actual deployed CPU must still be measured.
4. In Workers & Pages, find **Your subdomain**. Keep the assigned account subdomain or use **Change** to choose an available one.
5. Record that subdomain. The eventual URL will have the form `https://uniadapt-learning.YOUR_SUBDOMAIN.workers.dev`.

The hostname above is a pattern, not an existing working URL. Do not create or publish a sample application as a substitute for this build.

**Expected result:** Workers is available in the correct account, with the intended subscription/subdomain. D1 and the application still need to be configured.

## 3. Set up Zero Trust and the website login method

1. In the dashboard, select **Zero Trust**.
2. Complete organization onboarding: choose an available team name, select **Free**, and provide payment details when requested. Cloudflare documents that payment details are required even for Zero Trust Free, without a charge for that Free subscription.
3. Record the team origin, for example `https://YOUR_TEAM.cloudflareaccess.com`. It is different from your `workers.dev` account subdomain.
4. Add email-code login: **Zero Trust → Integrations → Identity providers → Add new identity provider → One-time PIN**. Save it.
5. Keep the exact email that should be allowed into the private UniAdapt website. The application policy is created in step 8 after the Worker exists.

New organizations currently default to Cloudflare's identity provider; email PIN login must be added explicitly if you want that method. No device client, VPN or Tunnel is needed for this Worker website.

**Expected result:** The Zero Trust organization exists and One-time PIN is available. This does not yet protect a UniAdapt URL.

Official references: [Zero Trust onboarding](https://developers.cloudflare.com/cloudflare-one/setup/) and [One-time PIN setup](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/).

## 4. Prepare your computer and authenticate Wrangler

Use Windows with **WSL/bash**, Linux or macOS for the commands below. Install Git, **Node.js 24** (recorded validation: 24.19.0), and pnpm **11.25.0**. Follow [local setup](SETUP.md) if these are not installed.

Clone the private repository while signed into a GitHub identity with repository permission:

```bash
git clone https://github.com/aiwithsiddhesh/uniadapt-learning.git
cd uniadapt-learning
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
node --version
pnpm --version
pnpm test
pnpm typecheck
```

If you already have a clean checkout, update it with `git pull --ff-only` instead of cloning again. Do not overwrite uncommitted client changes.

Authenticate the repository's installed Wrangler:

```bash
pnpm exec wrangler login
pnpm exec wrangler whoami
```

`login` opens browser authorization. Sign into the intended Cloudflare account and authorize Wrangler; do not copy a browser session or token into the repository. If WSL does not launch a browser, open the authorization URL printed by Wrangler on the same computer. `whoami` must show the intended account. When multiple accounts exist, add its `account_id` to the client config in step 5.

**Expected result:** Dependencies are installed, tests/typecheck pass, and Wrangler can operate in the intended account. OAuth login is sufficient for this manual deployment; a separate API token is not required.

## 5. Create D1 and configure the application

Create a **fresh** database, choosing one of these methods:

- CLI: run `pnpm exec wrangler d1 create uniadapt-staging`. If prompted to modify the repository configuration automatically, decline and apply the binding explicitly below.
- Dashboard: open **D1 SQL database**, select **Create Database**, enter `uniadapt-staging`, then select **Create**. Copy the database ID from the new database's details.

Do not use both methods to create duplicate databases. The `staging` name identifies this first private environment; use a separate database for later production.

Copy the application template:

```bash
cp wrangler.json wrangler.client.json
```

Edit the ignored **`wrangler.client.json`** at the repository root. Replace the database name/ID with the actual returned values. Keep the Worker name consistent. A complete starting config is:

```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "uniadapt-learning",
  "main": "build/uniadapt-worker.ts",
  "compatibility_date": "2026-05-15",
  "compatibility_flags": ["nodejs_compat"],
  "workers_dev": false,
  "preview_urls": false,
  "assets": {"run_worker_first": true},
  "vars": {
    "UNIADAPT_ACCESS_ISSUER": "",
    "UNIADAPT_ACCESS_AUDIENCE": "",
    "UNIADAPT_ALLOWED_EMAILS": ""
  },
  "d1_databases": [{
    "binding": "DB",
    "database_name": "uniadapt-staging",
    "database_id": "REPLACE_WITH_REAL_D1_DATABASE_ID",
    "migrations_dir": "drizzle"
  }]
}
```

If necessary, add `"account_id": "YOUR_SELECTED_CLOUDFLARE_ACCOUNT_ID"` as a top-level property. The example ID is a placeholder and must be replaced. Do not add a `DATABASE_URL` or Supabase key: this build uses the D1 binding named exactly **`DB`**.

Apply the delivered migrations and check the remote tables:

```bash
pnpm exec wrangler d1 migrations apply DB --remote --config wrangler.client.json
pnpm exec wrangler d1 execute DB --remote --config wrangler.client.json --command "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
```

Confirm you are targeting the new database before accepting the migration prompt. Expect the 25 application tables plus any provider/migration internal tables. Do not paste illustrative tutorial tables into the database; this repository's migrations define the application schema.

This creates a fresh environment. It does not move or delete data from the old private Site. Existing institutional records require a separate authorized full export/import, with IDs/history and backup validation. See [database operations](DATABASE.md).

**Expected result:** Real D1 is bound as `DB`, all delivered migrations are applied, and the client config keeps visitor/preview URLs disabled. Neither `wrangler.local.json` nor the database-only template is an application deployment config.

## 6. Build and upload with the visitor URL disabled

After tests/typecheck:

```bash
UNIADAPT_DEPLOY_CONFIG=wrangler.client.json pnpm build
pnpm check:deployment -- --upload-only
pnpm exec wrangler deploy --config dist/server/wrangler.json
```

`check:deployment` reads the **generated** artifact config, verifies a real D1 ID, disabled previews and Worker-first assets. Initial upload additionally requires `workers_dev=false`. The Worker resource can then be configured while its default URL remains disabled. Never deploy the default local-placeholder artifact.

The generated config connects both the compiled server and built assets. Deploy **`dist/server/wrangler.json`**, not the unbuilt source template. In **Workers & Pages**, confirm `uniadapt-learning` exists, its D1 binding is `DB`, and the default route/preview URLs remain disabled. The initial upload is not a usable visitor deployment.

## 7. Configure the two server secrets

Through the authorized Cloudflare secret interface/CLI, set independent random values of at least 32 characters:

```bash
pnpm exec wrangler secret put UNIADAPT_AUTH_SECRET --config wrangler.client.json
pnpm exec wrangler secret put UNIADAPT_BOOTSTRAP_TOKEN --config wrangler.client.json
```

Generate **two different random values**, for example two 64-character random secrets in your password manager. The CLI securely prompts for each value; do not put them in Git or command-line arguments. Do not reuse the example/local `.dev.vars` values for cloud hosting. Verify secret names without exposing values:

```bash
pnpm exec wrangler secret list --config wrangler.client.json
```

Store the bootstrap token privately for first-Admin initialization. `UNIADAPT_AUTH_SECRET` signs the four-hour institution sessions. The bootstrap token is checked only while no institution root exists; subsequent initialization is blocked. Retain both in the first deployment; agree rotation/recovery handling with the operator. This release does not provide a production Admin break-glass recovery flow.

**Expected result:** Both named secrets exist on `uniadapt-learning`. Neither value appears in source, client JavaScript or documentation.

## 8. Protect the Worker and configure Access settings

Follow Cloudflare's current [Protect one Worker](https://developers.cloudflare.com/workers/configuration/cloudflare-access/#protect-one-worker) procedure while the visitor URL remains disabled:

1. Open **Workers & Pages → uniadapt-learning → Access**.
2. Select **Protect this Worker behind Access**.
3. Choose **All traffic**, covering production as well as previews.
4. Configure an authentication policy allowing only the approved owner email. If creating a policy in Zero Trust, use **Allow → Include → Emails → your exact email**, with a name such as `UniAdapt owner only`.
5. Select **Apply Access**. Enable the One-time PIN provider for this application if email-code login is intended.
6. Review the corresponding application under **Zero Trust → Access controls → Applications**. Copy its **Application Audience (AUD)** tag and the organization's exact team origin. UI labels may vary; use the linked official guide if the Access tab is absent.

Keep preview URLs disabled. Do not select Everyone, an email-domain rule, Bypass or an unapproved group. Protect the whole Worker, not just `/login`. Check the saved policy rather than assuming its default audience is correct.

The team origin is `https://YOUR_TEAM.cloudflareaccess.com`; the AUD is the application's audience tag, not its name, account ID or D1 ID. See [token fields](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/).

Set these non-secret server settings in `wrangler.client.json.vars`:

```json
{
  "UNIADAPT_ACCESS_ISSUER": "https://YOUR_TEAM.cloudflareaccess.com",
  "UNIADAPT_ACCESS_AUDIENCE": "YOUR_EXACT_ACCESS_APPLICATION_AUD",
  "UNIADAPT_ALLOWED_EMAILS": "YOUR_AUTHORIZED_OWNER_EMAIL"
}
```

The issuer must be the canonical HTTPS team origin without a trailing slash/path. The Worker verifies Access signature, issuer, audience, expiry and the explicit email allowlist using `jose`; an arbitrary header or institution JWT cannot bypass this gate. Requests for HTML, APIs and static assets all pass through it. Missing settings fail closed; missing/invalid/unapproved Access tokens return 403. Development bypass exists only for loopback requests in a development build.

Rebuild and verify while `workers_dev` is still false:

```bash
UNIADAPT_DEPLOY_CONFIG=wrangler.client.json pnpm build
pnpm check:deployment
pnpm exec wrangler deploy --config dist/server/wrangler.json
```

**Expected result:** The saved Access application covers all Worker traffic and allows only the owner, and the deployed Worker has matching issuer/AUD/email settings plus both secrets. The visitor URL is still disabled.

## 9. Enable the protected URL and initialize UniAdapt

After confirming step 8, change only **`workers_dev` to `true`** in `wrangler.client.json`. Keep `preview_urls: false`, `assets.run_worker_first: true` and the owner-only Access policy. Build/check/deploy again:

```bash
UNIADAPT_DEPLOY_CONFIG=wrangler.client.json pnpm build
pnpm check:deployment
pnpm exec wrangler deploy --config dist/server/wrangler.json
```

Keep the source client config consistent with the live route setting for future deployments. A route without valid Access settings cannot serve app content because the Worker independently requires a verified allowed token. This extra check does not replace confirming that the actual Access policy is applied.

Open the **actual URL returned by the successful deployment**. Use One-time PIN to sign in as the allowed owner (or the configured identity provider), then initialize UniAdapt:

1. Confirm the UniAdapt sign-in page appears without a ChatGPT redirect.
2. In **Initialize your institution**, enter Admin name/email, a password of at least 12 characters and at most 72 UTF-8 bytes, and the private bootstrap token from step 7.
3. Submit once and confirm the Admin workspace.
4. Sign out, sign in again, then reload to confirm saved account/data persistence.

Cloudflare Access login and institution login are separate: the first admits an approved website visitor; the second chooses the authorized Admin/Teacher/Student workspace. There is no default Admin password or public account signup.

## 10. Verify the deployment

Complete the following before calling the deployment working/private:

1. Open `/` and confirm the UniAdapt sign-in page without a ChatGPT redirect.
2. If the database is fresh, enter Admin name/email, password and the private `UNIADAPT_BOOTSTRAP_TOKEN` in **Initialize your institution**.
3. Confirm first Admin creation, restart/reload persistence, sign-out/login and Admin academic controls.
4. Create synthetic Teacher/Student accounts and verify their institutional role boundaries.
5. Verify `/api/health` through Access and a 401 from protected domain routes without an institution session.
6. Try an incognito/unauthorized identity: it must not receive HTML/app assets, health or domain data. Test actual Access token expiry/revocation and alternative URL/preview exposure.
7. Record commit, generated config, DB/migration state, account Access policy, runtime CPU/latency and test results.

No real Cloudflare URL, policy, cost benchmark or client account acceptance is recorded yet. An operator must complete these steps before the deployment can be called working/private.

Record results against this checklist; these are required checks, not claims of completed cloud testing:

| Check | Expected result |
|---|---|
| Allowed owner | Access login succeeds; UniAdapt institutional login appears |
| Unauthorized/incognito visitor | Redirected to Access or denied; no UniAdapt HTML/assets or API data |
| Logged into Access, signed out of UniAdapt | Domain APIs reject with 401; session entry remains reachable |
| Admin login | Academic/account administration works and persists after reload |
| Teacher/Student | Each sees only its authorized workspace and scoped records |
| Second initialization | Rejected; no second institution/Admin is created |
| Health | Readiness succeeds through Access; no public health data |
| Routing | Production route protected; preview URLs disabled; all requests pass through the Worker |
| Runtime usage | No Worker CPU-limit failures; D1 and request/CPU usage reviewed |

Creating institutional Teacher/Student accounts does not grant Cloudflare Access. Keep this first version owner-only. Adding client visitors later requires the owner's approval, an Access policy update and the matching exact `UNIADAPT_ALLOWED_EMAILS` update/redeployment.

## Updates, troubleshooting and handover

### Updating the application

From a clean authorized checkout, preserve the ignored client config and server secrets:

```bash
git pull --ff-only
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm exec wrangler d1 migrations list DB --remote --config wrangler.client.json
```

If migrations are pending, create a backup and review compatibility using [database guidance](DATABASE.md) before applying them. Then rebuild, run `pnpm check:deployment` and deploy using the same three commands in step 9. Verify the affected role workflows, route protection and health, and record the release. A rebuild does not require regenerating secrets.

### Common problems

| Symptom | Check / action |
|---|---|
| GitHub clone denied | Authenticate to GitHub using a user with access to this private repository |
| Wrangler cannot authenticate | Complete browser OAuth; use `whoami` and verify the selected account |
| D1 database/binding missing | Real database ID, correct account, binding exactly `DB`, remote migrations applied |
| Deployment check rejects placeholder | Build with `UNIADAPT_DEPLOY_CONFIG=wrangler.client.json`; do not deploy the local default |
| Wrong config deployed | Use generated `dist/server/wrangler.json`; the source/database-only configs are insufficient |
| Access page sends no PIN | Enable One-time PIN for the app, confirm the exact email is allowed and check mail filtering; blocked emails receive no code |
| App returns 503 for private access | Check issuer/AUD/allowlist settings and rebuild with the client config |
| App returns 403 after Access sign-in | Check exact email, correct application AUD/team issuer, expired token and saved Access policy; do not disable the gate |
| Institution initialization rejected | Check both server secrets, the private bootstrap token, password limits and whether initialization already occurred |
| Institution API returns 401 | Sign in to UniAdapt after Access; the two sessions are separate |
| Password operation fails with CPU limit | Confirm Workers Paid is active; inspect provider CPU metrics/logs and investigate before rollout |
| URL appears unprotected or previews are enabled | Disable the route in the dashboard, keep it disabled in the client config, and fix/reverify Access before restoring it |

For live logs, use **Workers & Pages → uniadapt-learning** and its logs/observability controls, or `pnpm exec wrangler tail --config wrangler.client.json`. Handle logs privately; do not copy credentials, real Student records or setup links into support issues. See [operations](OPERATIONS.md) for backup/restore and rollback.

### Deployment handover record

Retain account/Worker name and account ID, exact private URL, source commit, D1 name/ID, migration results, Access application/AUD, owner allowlist, verification results, billing owner and backup/operations owner. Record secret **names and secure storage responsibility**, never secret values in the repository.

### GitHub-driven updates

Once initial resource/secret/Access setup is complete, the owner can configure Cloudflare's Git integration or an approved GitHub Actions workflow to run locked installation, tests, typecheck, a client-configured build and the deployment check before publishing. Use provider/GitHub secret stores and restrict deployment permissions to the selected account/Worker. GitHub repo access does not automatically grant app Access.

No deployment workflow or cloud credentials are enabled automatically in this repository. Never publish GitHub Pages as a substitute for the backend or expose the private port/application publicly without approval.

The ignored `wrangler.client.json` is not available to a clean GitHub build. A future deployment integration must supply the reviewed account/D1/Access configuration to that build and pass the same deployment checks. Do not use the default placeholder config with an automatic Deploy button.

### Official references

- [Cloudflare account and Zero Trust setup](https://developers.cloudflare.com/cloudflare-one/setup/)
- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [D1 database creation and bindings](https://developers.cloudflare.com/d1/get-started/)
- [Protect one Worker with Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
- [One-time PIN identity provider](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/)
- [Access token fields](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)
- [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
