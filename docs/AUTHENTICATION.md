# Authentication, authorization and account lifecycle

## Two separate access layers

| Layer | Purpose |
|---|---|
| Cloudflare Access plus Worker verification | Owner-only access to HTML, APIs and assets; signature/issuer/audience/expiry/email allowlist verified |
| Institution authentication | Supabase passwords; D1 Admin/Teacher/Student roles, four-hour app sessions and academic scope |

The current source does not use ChatGPT Sites identity headers or reserved sign-in paths. `lib/private-access.ts` verifies Cloudflare Access using `jose`; `build/uniadapt-worker.ts` enforces it for all requests. Missing settings fail closed. Only loopback requests in a development build bypass the outer gateway; institution authentication stays enabled. See [private deployment](CLOUDFLARE_DEPLOY.md).

A setup/reset link does not grant Cloudflare Access or GitHub permission. The deployer must separately approve the owner/client audience.

## Server configuration

| Configuration | Value / purpose |
|---|---|
| `UNIADAPT_AUTH_SECRET` | Random server-side HMAC signing secret; minimum 32 characters |
| `UNIADAPT_BOOTSTRAP_TOKEN` | Private first-Admin initialization token; minimum 32 characters |
| `UNIADAPT_ACCESS_ISSUER` / `UNIADAPT_ACCESS_AUDIENCE` | Cloudflare Access team issuer and application audience |
| `UNIADAPT_ALLOWED_EMAILS` | Exact comma-separated email allowlist for the private gateway; no wildcards |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | Dedicated project HTTPS origin and modern publishable API key |
| `SUPABASE_SECRET_KEY` | Server-only managed-auth admin key in Cloudflare secret storage |
| `UNIADAPT_LOCAL_AUTH` | Enables local bcrypt only when true in a development build; never a production fallback |
| `DB` | D1 binding containing accounts, institution root, token versions and throttling/audit tables |
| JWT issuer / audience | `uniadapt-learning` / `uniadapt`, defined in code |
| Session cookie | `uniadapt_session`; Secure, HttpOnly, SameSite=Strict; four-hour maximum age |
| Roles | Exactly one of `ADMIN`, `TEACHER`, `STUDENT` |

On standalone Cloudflare, the operator must set the secret in that account. Cloudflare D1 and an owner-only Access application are provisioned; the dedicated Supabase project, server secrets and deployed Worker are still pending. For local development run `pnpm setup:local`. For a completed client-owned Worker deployment, the authorized operator can set the secret using the provider secret store / `wrangler secret put UNIADAPT_AUTH_SECRET` against that Worker's deployment config, not the database-only config. Never put the secret in client JavaScript, an issue, the README or a build artifact.

UniAdapt has no refresh-token flow. Supabase access/refresh tokens stay server-side, are verified/discarded and are never returned to the browser. Protected requests validate JWT signature, issuer/audience, four-hour validity, active account, matching role and `token_version`. Logout, reset, revocation and relevant account changes invalidate earlier sessions. Production passwords are stored and processed by Supabase Auth, which uses bcrypt. The development-only local provider uses bcrypt cost 10. Production cannot fall back to local hashes. Password input must have at least 12 characters and no more than 72 UTF-8 bytes. See `lib/supabase-auth.ts`, `lib/runtime-auth.ts` and `lib/auth.ts`. Provider JWT signatures, issuer, audience, expiry, email and the reserved UUID are verified. Provider roles and user-editable metadata do not grant application permissions. A server-controlled credential generation in signed `app_metadata` must match D1. A late password write from a revoked reset cannot authenticate against a newer activated generation.

## First Admin

1. Initialize/migrate fresh D1, configure Supabase using [Supabase setup](SUPABASE_SETUP.md), and set the three server secrets plus private gateway settings.
2. Pass the private Cloudflare Access policy in cloud production, or open the loopback developer URL.
3. The sign-in screen shows **Initialize your institution** when the default institution root does not exist.
4. Enter Admin identity/password and the private `UNIADAPT_BOOTSTRAP_TOKEN` supplied by the operator; submit once.
5. Confirm the Admin-only workspace and initialize the academic structure.

Bootstrap is not an ongoing public signup endpoint. A second initialization is rejected. No default Admin password is supplied. The initial campus includes labeled starter material and a sample learner profile; see [User guide](USER_GUIDE.md#starter-data-and-clean-client-data) before client use.

## Teacher and Student creation

In **User accounts**, Admin creates the identity, optional username, role and appropriate Department/Student link. Teacher responsibilities and Student placement are maintained through academic administration, not user-selected roles.

After creation, the UI returns a single-use setup link with expiry. Share it using the client's approved private channel. The user opens it after passing the outer website access gate, chooses a password and receives their role workspace. Automatic email/SMS delivery is not implemented or required by the foundation spec.

CSV import creates inactive Student accounts without passwords. After importing valid rows, find each account in **User accounts → Setup / reset link** and deliver its link privately. Use batch delivery tooling only after it is implemented and authorized; there is currently no automatic invitation campaign.

## Password reset and account maintenance

| Action | Admin/user procedure | Result |
|---|---|---|
| Reset password | Admin selects **Setup / reset link**; intended user consumes it | Password replaced; account active; previous sessions revoked |
| Revoke access session | Admin selects **Revoke sessions**, or user signs out | Token version increases; old sessions fail; explicit Admin revocation also invalidates outstanding setup tokens |
| Deactivate Teacher/Student | Admin selects **Deactivate** | Login fails and issued sessions/links are revoked; academic history is retained |
| Activate existing account | Admin selects **Activate** | Active flag restored; a configured password/setup completion is still needed |
| Change identity, role or Department | Admin edits the account | References validated; protected role changes rejected; earlier sessions and old links invalidated |

Setup/reset links contain a random 32-byte token in a URL fragment. Only its SHA-256 hash is stored. They expire after 24 hours, replace earlier links and are consumed once after managed password/identity verification and a guarded D1 transaction. The account is made inactive and existing sessions are revoked before remote password changes. Concurrent redeemers and Admin edits cannot reactivate a stale claim. The UI removes the fragment from browser history after reading it. Do not include real links/tokens in screenshots, support tickets or shared documentation.

Role changes cannot orphan Teacher ownership/assignments or a Student's active academic records. The sole Admin role cannot be removed. The standard activation/deactivation/reset controls reject Admin account changes of that kind; the Admin password recovery/operator runbook needs a separately reviewed procedure. There is no documented production break-glass account or public self-service recovery flow in this release.

## Scope and failure behavior

- Student reads/changes their own permitted learning records; assigned subjects are read-only. Draft banks, undisclosed keys and peer identities are excluded.
- Teacher accesses assigned SubjectInstances and permitted roster/history. CO and PRIMARY Teachers can perform assigned operations; only the designated Subject Owner activates shared curriculum/bank material.
- Admin operates the institution's accounts and academic structure.
- Authentication failure returns 401; a valid user attempting an unauthorized action receives 403. Stale academic/campus revisions return 409.
- Requests with a supplied cross-origin `Origin` are rejected. Cookies use SameSite=Strict. A full independent security/CSRF penetration assessment is not claimed.
- Defaults are five failed attempts/account and twenty/IP per 900-second window, configurable under Institute authentication policy. Username/email aliases share the account bucket. Missing upstream client-IP headers use a shared fallback bucket; host migration must preserve a trusted client-IP signal.

## Managed-provider failure and recovery

A provider outage returns a generic 503 and does not expose keys or provider response bodies. A failed password reset leaves the account inactive with earlier sessions revoked; retry its legitimate link once service recovers. Normal failures release the claim. If the Worker terminates before cleanup and the link remains busy, the Admin issues a replacement link; the previous token is deleted. Academic records remain intact.

Existing local accounts are not silently linked by email. Each must complete a fresh Admin-issued setup/reset link, reserving its known UUID in D1 and creating/verifying that identity in Supabase. There is no bulk password migration. D1 identity edits synchronize only the known provider UUID on the next login.

Use application controls for reset/revocation/deactivation. Changing a password or banning an account directly in the Supabase console does not automatically increment D1 token versions or revoke existing UniAdapt cookies. Coordinate an app revocation first. Removing a D1 account does not have an automatic provider deletion flow.

## Secret rotation

Plan a maintenance window, set a new random secret in the environment's secret store, redeploy/restart as required and verify health plus all three role logins. Existing JWT signatures stop validating, so users must sign in again. Rotating the signing secret does not change provider passwords or local development hashes or by itself invalidate outstanding setup-token hashes. Use Admin revocation/reset-token management when those must also be invalidated. Never reuse staging/development secrets in production.

## Standalone authentication status

The Sites dependency has been removed. Protected bootstrap, institutional login and the verified Cloudflare Access Worker gateway are implemented and tested. Cloudflare D1 and owner-only Access policy are created. A dedicated Supabase project, Worker deployment, live role/browser acceptance and CPU/load verification remain pending; no working external product URL exists yet. No institutional SSO, MFA, automatic email provider or public signup is implemented.

First initialization requires `UNIADAPT_BOOTSTRAP_TOKEN` of at least 32 characters and commits campus/root/Admin/audit atomically. Incorrect/missing authorization creates no records; concurrent initialization creates one Admin. The UI requests this token only for initialization. Configure it privately and never put its value in an issue or screenshot.
