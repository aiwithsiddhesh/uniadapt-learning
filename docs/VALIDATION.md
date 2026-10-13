# Handover validation record

**Date:** 13 October 2026
**Business source:** GitHub import `4a1214fa3b406ca01bc14a255ce5bb8feb0568fa`, corresponding to Sites business source `c6e526fc91d288f0757c7807cff0b580ef0cbeb5`
**Runtime:** Node.js 24.19.0; pnpm 11.25.0; pinned repository dependencies

Checks ran in a separate source snapshot with installed dependency reuse. This establishes source/tooling behavior in the available environment; installation on a completely fresh client machine is not claimed.

| Check | Result | Evidence boundary |
|---|---|---|
| Business test suites | 99 passed; zero failures/skipped | Synthetic domain/integration and role-rendering tests |
| TypeScript | Passed | `tsc --noEmit` |
| Production compilation | Passed | Vinext client/RSC/SSR Worker build; no deployment performed for documentation changes |
| Local secret creation | Passed | Random ignored local secret created without printing value |
| Setup repeated with existing secret | Passed | Existing file/hash unchanged |
| Empty existing secret | Passed negative case | Exit failure; existing file preserved rather than overwritten |
| Setup configuration check | Passed | Installed tools, Node, local binding, secret presence and migration files |
| Fresh local D1 migrations | Seven applied successfully | Wrangler 4.92.0 local simulation, separate from live Site |
| Repeated local migrations | No outstanding migrations | Wrangler migration tracker respected |
| Local schema | 25 application tables | Provider/migration metadata excluded from count |
| Referential checks | Zero foreign-key violations | Local migrated schema |
| Documentation CSV | Both rows valid with required elective allocated | Synthetic hierarchy/elective fixture described in User guide |
| Local Markdown links/anchors | Passed | Files/section targets checked |
| Secret/runtime exclusions | Passed | `.dev.vars`, local D1, dependencies and output excluded from tracked source |

Still pending: browser clicks/layout/accessibility, independent security assessment, clean-machine dependency installation, client-owned D1 provisioning, standalone identity integration, backup restoration, actual client UAT and production load/concurrency. The checklist in [Testing](TESTING.md) is for executing these checks, not a set of pre-approved passes.

The prior live version-4 readiness probe returned ready/connected and passed assessment, planning, role, authentication, enrollment and calendar fixtures; unauthenticated academic access returned 401. That is earlier deployed-version evidence and does not certify a future client host or an unchanged environment indefinitely.

## Standalone preparation update — 13 October 2026

All 106 tests and standalone production build passed, including seven new bootstrap/private-gateway tests. Generated config disables public and preview URLs and uses Worker-first asset requests. The signing/gateway behavior is tested with synthetic keys/fixtures. No real Cloudflare deployment or Access policy has been created or accepted.


## Managed-auth update — 13 October 2026

| Check | Result | Evidence boundary |
|---|---|---|
| Current full suite | 124 passed; zero failed/skipped | Original 106 plus 18 managed-auth tests |
| TypeScript and production build | Passed | Generated Worker environment types; Vinext UI/server output |
| Setup/local migration | Passed | Ninth additive migration applied; local development provider explicit |
| Local HTTP interaction smoke | Passed | HTML/readiness, anonymous API denial, Admin initialization/login, Teacher setup, Admin-route denial, single-use link, logout revocation and re-login |
| Managed provider protocol | Passed with synthetic transport/ES256 keys | UUID creation/retry/delete, signed identity and metadata distrust, bounded/redacted provider failures |
| Managed reset/races | Passed with synthetic provider | Outages, parallel claims, expired token, concurrent Admin changes, abandoned-claim replacement, late stale password writes, signed credential-generation matching and bootstrap compensation |
| Remote D1 | Nine migrations, 25 app tables, zero foreign-key violations | Authenticated Cloudflare API; fresh dedicated database |
| Private Access configuration | Owner-only exact-email policy and One-time PIN created | Future Worker hostname; no live Worker content exposed |
| Live Supabase login / live product URL | Pending | Dedicated project creation unavailable through connector |
| Browser click/visual acceptance | Pending | Cloud browser cannot reach the isolated local server; HTTP tests are not browser acceptance |
| Workers Free CPU / real-provider latency | Pending | No deployed benchmark; do not infer Free suitability from local build/tests |

The earlier standalone note above is historical. Actual current account/resource details and blockers are in [deployment status](DEPLOYMENT_STATUS.md). No paid plan was selected, no public route was enabled and no product deployment is claimed.
