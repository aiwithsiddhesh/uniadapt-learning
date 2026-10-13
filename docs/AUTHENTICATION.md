# Authentication, authorization and account lifecycle

## Two separate access layers

| Layer | What it controls | Current owner/configuration |
|---|---|---|
| ChatGPT Sites | Who can reach the private hosted website and trusted native identity headers | Existing Site owner and Sites sharing policy |
| UniAdapt institution | Admin/Teacher/Student role, credentials, current session and academic scope | Institution Admin plus server-side account/auth code |

Both matter. The current hosted Site is owner-private. An invitation generated inside UniAdapt neither invites a person to GitHub nor grants Sites audience access. Client/Teacher/Student website access must be authorized separately before links can be used on that Site.

`app/chatgpt-auth.ts` reads the platform's trusted `oai-authenticated-user-*` headers. `/` and `/api/session` depend on that native identity. In development, `build/sites-vite-plugin.ts` supplies a loopback-only mock after local Sites sign-in. Production must never trust these headers directly from public clients. A generic reverse proxy that merely forwards them is not a secure replacement.

## Server configuration

| Configuration | Value / purpose |
|---|---|
| `UNIADAPT_AUTH_SECRET` | Random server-side HMAC signing secret; minimum 32 characters |
| `DB` | D1 binding containing accounts, institution root, token versions and throttling/audit tables |
| JWT issuer / audience | `uniadapt-learning` / `uniadapt`, defined in code |
| Session cookie | `uniadapt_session`; Secure, HttpOnly, SameSite=Strict; four-hour maximum age |
| Roles | Exactly one of `ADMIN`, `TEACHER`, `STUDENT` |

On the existing Site, the secret is already in hosting secret storage. Its value is not delivered in Git. For local development run `pnpm setup:local`. For a completed client-owned Worker deployment, the authorized operator can set the secret using the provider secret store / `wrangler secret put UNIADAPT_AUTH_SECRET` against that Worker's deployment config, not the database-only config. Never put the secret in client JavaScript, an issue, the README or a build artifact.

There are no refresh tokens. Protected requests validate JWT signature, issuer/audience, four-hour validity, active account, matching role and `token_version`. Logout, reset, revocation and relevant account changes invalidate earlier sessions. Passwords use bcrypt with cost 10. Password input must have at least 12 characters and no more than 72 UTF-8 bytes. See code in `lib/auth.ts`; hashing is not performed by an external auth SaaS.

## First Admin

1. Initialize/migrate a fresh database and configure the secret.
2. Enter through the authorized Sites identity, or use the local developer mock on localhost.
3. The sign-in screen shows **Initialize your institution** when the default institution root does not exist.
4. Enter Admin identity and a password satisfying the rule above; submit once.
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

Setup/reset links contain a random 32-byte token in a URL fragment. Only its SHA-256 hash is stored. They expire after 24 hours, replace earlier links and are consumed once transactionally with password update and audit. The UI removes the fragment from browser history after reading it. Do not include real links/tokens in screenshots, support tickets or shared documentation.

Role changes cannot orphan Teacher ownership/assignments or a Student's active academic records. The sole Admin role cannot be removed. The standard activation/deactivation/reset controls reject Admin account changes of that kind; the Admin password recovery/operator runbook needs a separately reviewed procedure. There is no documented production break-glass account or public self-service recovery flow in this release.

## Scope and failure behavior

- Student reads/changes their own permitted learning records; assigned subjects are read-only. Draft banks, undisclosed keys and peer identities are excluded.
- Teacher accesses assigned SubjectInstances and permitted roster/history. CO and PRIMARY Teachers can perform assigned operations; only the designated Subject Owner activates shared curriculum/bank material.
- Admin operates the institution's accounts and academic structure.
- Authentication failure returns 401; a valid user attempting an unauthorized action receives 403. Stale academic/campus revisions return 409.
- Requests with a supplied cross-origin `Origin` are rejected. Cookies use SameSite=Strict. A full independent security/CSRF penetration assessment is not claimed.
- Defaults are five failed attempts/account and twenty/IP per 900-second window, configurable under Institute authentication policy. Username/email aliases share the account bucket. Missing upstream client-IP headers use a shared fallback bucket; host migration must preserve a trusted client-IP signal.

## Secret rotation

Plan a maintenance window, set a new random secret in the environment's secret store, redeploy/restart as required and verify health plus all three role logins. Existing JWT signatures stop validating, so users must sign in again. Rotating the signing secret does not change stored password hashes or by itself invalidate outstanding setup-token hashes. Use Admin revocation/reset-token management when those must also be invalidated. Never reuse staging/development secrets in production.

## Standalone authentication migration

Not implemented: MFA, institutional SSO, Google login for institution accounts, OAuth provider mapping, Supabase Auth or a public user signup page. The Google sign-in used to create the GitHub repository is unrelated to UniAdapt authentication.

Before removing the Sites dependency, implement an authenticated server identity boundary, restrict fresh-institution bootstrap, replace reserved platform sign-in/out paths, remove local mock behavior from production, establish trusted header stripping/IP handling and retain account/RBAC/token checks. Test all three roles, invitation entry, logout/reset/revocation, cross-origin behavior and direct origin access in the target host. Review [Operations](OPERATIONS.md#standalone-client-hosting) before client release.
