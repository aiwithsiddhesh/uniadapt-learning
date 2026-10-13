# Deployment, backup and maintenance runbook

## Current deployment inventory

| Asset | Known state | Handover status |
|---|---|---|
| GitHub | Private `aiwithsiddhesh/uniadapt-learning`, branch `main` | Source delivered; client repository access not granted by documentation |
| Live application | `https://uniadapt-learning.siddhesh-ssp-parab.chatgpt.site` | Sites version 4, owner-private; business source `c6e526fc91d288f0757c7807cff0b580ef0cbeb5` |
| Sites project | `appgprj_6acd2a13522481919ce356ae2669a98b` in `.openai/hosting.json` | Existing owner controls it |
| Database | Provider-managed D1 bound as `DB` | No client cloud credentials/database ID transferred |
| Session signing | `UNIADAPT_AUTH_SECRET` in hosting secret storage | Secret value intentionally absent from Git |
| Original files/vector storage | No active R2/vector configuration | Required for later content/AI work |
| CI/CD | No GitHub auto-deployment or acceptance CI pipeline configured | Maintainer publishes manually through authorized hosting workflow |

The GitHub source was imported from the live version and now includes a standalone Cloudflare runtime, private gateway and protected first-Admin initialization. Pushing source to GitHub does not deploy the standalone application, redeploy the historical Site or transfer hosting ownership.

## Legacy Sites deployment procedure (historical source only)

Use the existing project's authorized Sites management workflow; do not create a second Site merely to update code.

1. Identify the reviewed GitHub commit and synchronize its intended source into the Sites-managed source checkout. GitHub and Sites source repositories are separate; retain provenance rather than assuming their commit SHAs are interchangeable.
2. Run `pnpm test`, `pnpm typecheck` and the production build in the appropriate environment; review any migrations and verify staging/backup readiness.
3. Confirm existing `DB` binding and session secret; keep the project ID and audience unchanged unless an authorized owner explicitly changes them.
4. Use the managed source preparation/build/archive workflow. Push the exact source used for the artifact to the Site's source repository with short-lived authorized credentials.
5. Save and privately deploy that exact pushed version through Sites. Do not upload an arbitrary source ZIP as a Worker build or report an unsaved/failed deployment as live.
6. Wait for successful deployment status; run read-only `/api/health` and institution authorization probes through the private audience gate.
7. Record GitHub commit, Sites source commit/version, deployment result, schema revision and validation evidence in the release log.

The runtime secret is managed separately from source. A deployment does not create Teacher/Student website audience permissions. No public deployment is authorized by this handover.

## Standalone client hosting

**Status: managed-auth code tested; cloud D1 and owner-only Access provisioned; dedicated Supabase project and Worker deployment pending.** See [actual deployment record](DEPLOYMENT_STATUS.md). Follow [private Cloudflare deployment](CLOUDFLARE_DEPLOY.md). The current source uses `wrangler.json`, a standalone Worker entrypoint, protected initialization and Cloudflare Access validation; it no longer requires Sites identity or publishing. The legacy Sites procedure applies only to the historical version-4 source, not this standalone build.

| Migration task | Required result |
|---|---|
| Provider ownership | Client controls hosting account, billing, environment names and private/staging access |
| Build/deploy integration | Reviewed Worker entrypoint/assets, client resource bindings and repeatable artifact build; no placeholder IDs deployed |
| Identity boundary | Configure the implemented Access gateway, protected bootstrap and institution auth with authenticated server identity; block forged identity headers and unauthenticated bootstrap |
| Institution auth | Configure Supabase passwords and preserve D1 role/JWT/token-version checks; rerun scope/reset/revocation tests |
| Data transfer | Export/import all relevant tables/cache and migrate schema; verify IDs, history, row counts and foreign keys |
| Secrets | Client-owned environment-specific secret store; no frontend or committed credentials |
| Operations | Restricted origin/admin access, trustworthy IP handling, logs/health, backups, tested restore and rollback |
| Acceptance | End-to-end browser and real-provider tests for Admin/Teacher/Student; target load/concurrency and cache-growth tests |

Use the root `wrangler.json` as the application template and follow the standalone guide to bind real D1 as `DB`. `wrangler.local.json` and the database-only template are database-administration configs, not deployment configs. Do not run a generic deploy command against either expecting a complete private product.

Vercel, a VPS, moving academic data to PostgreSQL/Supabase, or alternate auth providers need separate architecture/adapter changes. Supabase password authentication is already integrated; use [Supabase setup](SUPABASE_SETUP.md). The delivered Next-style routes do not make this an ordinary portable `next start` application; the runtime imports `cloudflare:workers`.

## Release checklist

- [ ] Reviewed source commit, business scope and migration diff recorded.
- [ ] Automated tests/typecheck/build pass; browser/client acceptance completed for the affected flows.
- [ ] Recovery backup/export exists and its restore has been demonstrated in isolation.
- [ ] Schema/data compatibility checked; secrets/bindings and environment audience confirmed.
- [ ] Deployment succeeds; runtime health and all role boundaries verified.
- [ ] Release log updated with known limits; maintainer/on-call owner informed through agreed procedures.

These are checklist items for the operator, not a record that production acceptance has already occurred.

## Backups and restore

The application has no scheduled backup/export job. UI plan/progress/import CSV files do not preserve accounts, schema, attempts or full history and are not adequate recovery backups.

For client-owned D1, follow the [full SQL export/isolated restore procedure](DATABASE.md#backup-restore-and-migration-to-another-environment). Before schema changes, take an export/provider recovery point. Agree encrypted storage location, access, retention, frequency and recovery objectives with the client. Test recovery after significant schema/data changes and record the result.

For the current Sites-managed database, arrange access through the authorized host owner/support interface. Do not assume the client's Cloudflare account can export a database owned by the Sites provider. D1 Time Travel and export are provider capabilities; their availability/access and retention in the current managed hosting arrangement have not been verified for the client.

Restoration can reintroduce previous token versions/links and older data. Reconcile session/token revocation, keep recovery inaccessible while testing, and verify no newly acquired audience permissions expose restored personal records. See [Cloudflare Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/).

## Rollback

Application rollback and database rollback are different operations. Prefer additive compatible migrations and application rollback to a known working private version. Do not remove additive tables/columns merely to match old code.

If a data rollback is necessary, determine the affected write window, restore to an isolated database first, verify it and agree how subsequent writes will be reconciled. An operator must approve the exact restore/replacement action. This release does not ship automated reversible down-migrations or a tested production cutover tool.

## Monitoring and incident response

Use hosting Worker logs, health status, 4xx/5xx patterns, D1/storage errors and latency metrics through the authorized provider interface. No application alerting/SLO dashboard is configured. Avoid aggressive polling of `/api/health`, which performs synthetic cryptographic/domain checks.

| Incident | Immediate checks | Recovery direction |
|---|---|---|
| Health 503/storage failure | Binding, secret and schema/table presence; provider logs | Repair environment/migration; validate isolated recovery before data replacement |
| Many 401 responses | Secret change, expired/revoked institution sessions | Restore intended access/config or require sign-in; do not disable auth |
| Unexpected 403 | Role, assignment, active scope and origin | Correct authorized assignment or setup; preserve access restrictions |
| 409 conflicts | Concurrent writes/stale previews | Reload/repreview; retry deliberate operation, not blind resubmission |
| 413 cache limit | JSON cache size and material/history growth | Preserve/export data; prioritize normalized learning storage; do not silently discard history |
| Suspected credential exposure | Which environment/account/token was affected | Revoke account sessions/links, rotate signing secret if appropriate, review audit/access |
| Wrong calendar/allocation | Actor/revision, preview/snapshots and recent change | Correct through Admin controls; validate resulting plan/history |

Record incident time, environment, commit/deployment, affected scope, redacted log/request identifier, repair and verification. Application/domain audit histories are not a replacement for a complete tamper-resistant institutional audit archive.

## Routine maintenance

Review provider billing/resource usage, security/dependency updates, account/assignment ownership, cache growth, backup results and unresolved client defects. Upgrade pinned framework/Worker versions in a reviewed branch; rerun tests/build and target-provider/browser acceptance. Do not automatically upgrade every dependency in production.

There is no implemented data retention/disposal scheduler, full learning-data normalization, nightly job service or complete notification pipeline. Agree those controls before storing production Student data at scale. This guide does not set a legal retention period or claim regulatory certification.

## Operating ownership and costs

The client must identify an infrastructure/billing owner, institution Admin, technical maintainer, product owner and data/retention contact. Existing owner access is not equivalent to a maintenance contract. Define support hours, response targets, update/backup responsibilities and offboarding in the separate service agreement.

No production cost estimate or spend cap has been validated. AI currently generates no provider requests; future AI cost depends on the chosen integration and traffic. Evaluate current hosting/D1/storage/provider pricing in the client account and configure provider billing alerts where available; alerts are not necessarily spending caps.
