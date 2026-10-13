# Supabase managed authentication setup

## Purpose and delivery status

Supabase Auth handles cloud passwords. Cloudflare hosts the application, D1 stores academic data and authoritative account roles, and Cloudflare Access restricts website visitors. Supabase Postgres is not the academic database in this release.

**13 October 2026:** The integration is implemented and passes 18 managed-auth tests within the 124-test release. No UniAdapt Supabase project has been created, no live provider credentials have been tested, and the external Worker product is not deployed. The connector's cost/project-creation flow is unavailable. See [deployment record](DEPLOYMENT_STATUS.md).

## Resources and free plan

Use one dedicated project in a Free organization. The connected `CraftedBySiddhesh's Org` is Free; its unrelated inactive projects are not used or modified. Create `uniadapt-learning` as a new project, preferably Mumbai (`ap-south-1`) for an India pilot if available.

Supabase Free currently includes 50,000 monthly active users and a 500 MB database, with two active Free projects allowed. Free projects may pause after a week of inactivity. These are provider allowances, not product throughput guarantees. Do not enable paid compute, branching or a Pro subscription for this pilot. Check the displayed organization/project price before creation. See [pricing](https://supabase.com/pricing).

No SMTP subscription is needed for the current manual setup/reset workflow. No Supabase Edge Functions, Storage, Realtime, embeddings or AI provider is required through M04. Automated email delivery is a future integration.

## 1. Create the dedicated project

1. Open [Supabase dashboard](https://supabase.com/dashboard), sign in and select the approved Free organization.
2. Choose **New project**, name it `uniadapt-learning`, and confirm the intended Free organization/region.
3. Generate and securely store the database password using the authorized account owner. This password is for database administration and is not an app environment variable.
4. Confirm that the price is $0 and create the project. Wait for healthy/active status.
5. Record the project reference and HTTPS project URL. Leave unrelated projects unchanged.

Do not run UniAdapt's SQLite/D1 migrations in Supabase SQL Editor. The provider manages its own Auth schema; the nine application migrations belong in D1.

## 2. Configure Auth

1. Keep email/password authentication enabled. Public user signup is not required; disable **Allow new users to sign up** for this managed institution workflow. Privileged Admin creation is used for approved accounts.
2. Use an active asymmetric JWT signing key, **ES256 or RS256**, under **Authentication → Signing Keys**. New projects may already have one. Verify it rather than rotating unrelated project keys. This adapter rejects HS256 provider tokens.
3. Set the project **Site URL** to the actual private UniAdapt URL after deployment. The current workflow does not use provider redirect callbacks or automatic emails.
4. Use a password policy compatible with the app's minimum 12 characters and maximum 72 UTF-8 bytes. Do not enable policies that contradict the accepted UI without updating validation and testing.
5. Avoid adding unused OAuth/anonymous providers. App roles are assigned in D1; Supabase metadata cannot choose an Admin role.

The backend creates a user at the reserved application UUID, sets `email_confirm: true`, sets a server-controlled `app_metadata.uniadapt_credential_generation`, then verifies its password, signed identity and matching credential generation before activation. This is a manually administered institution identity workflow, not proof that a user owns the supplied email address. The Admin must validate identities before sharing links.

Official references: [password authentication](https://supabase.com/docs/guides/auth/passwords), [JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys), [admin user creation](https://supabase.com/docs/reference/javascript/auth-admin-createuser).

## 3. Obtain the correct API keys

Open **Project Settings → API Keys** and obtain:

| Setting | Expected format | Destination |
|---|---|---|
| `SUPABASE_URL` | `https://PROJECT_REF.supabase.co`, canonical origin without slash/path | Ignored `wrangler.client.json.vars` |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | Ignored client deployment config; non-secret but not required in browser code |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` | Cloudflare Worker secret storage only |

Use modern keys. Legacy `anon`/`service_role` JWT keys are not accepted by this adapter. The database password and JWT private key are not API keys and must not be copied into app settings. Never put the secret key in a frontend-prefixed variable, JavaScript asset, GitHub issue or repository file.

The server sends modern keys through the `apikey` header. It does not use them as Bearer JWTs. See [API key guidance](https://supabase.com/docs/guides/api/api-keys).

Configure the URL/publishable key in `wrangler.client.json` and set the secret on the intended Worker using its secret store or:

```bash
pnpm exec wrangler secret put SUPABASE_SECRET_KEY --config wrangler.client.json
```

Follow [Cloudflare deployment](CLOUDFLARE_DEPLOY.md) for the other secrets, private gateway, artifact build and route activation order.

## 4. Verify managed account workflows

Use synthetic users in the new private environment:

1. Complete first-Admin initialization with the private bootstrap token. Confirm that one D1 Admin and one matching Supabase UUID exist, with no D1 password hash.
2. Sign out and sign in by email; add a username and repeat sign-in.
3. Create a Teacher through **User accounts**. Before its setup link is used, the D1 account is inactive and no managed password identity is required.
4. Use its private setup link, then verify the Teacher workspace and rejection of Admin APIs. Repeat for a Student linked to authoritative placement.
5. Generate/reset a password, verify that earlier app sessions fail, and confirm that the used/replaced setup link cannot be reused.
6. Revoke/deactivate through UniAdapt; verify immediate rejection on the next protected request. Academic history must remain.
7. Confirm that browser API responses never include Supabase access/refresh tokens, secret keys or password hashes.

Health's `supabase-configured` value checks settings only. It is not evidence that keys, signing configuration or login work. Record live results separately in [validation](VALIDATION.md).

## Recovery and existing data

| Situation | Recovery |
|---|---|
| Provider paused or unavailable | Restore the new project through authorized provider controls; retry sign-in. Failed reset accounts remain inactive until a legitimate retry succeeds. |
| Reset/setup link reports busy after interruption | Admin issues a replacement link, invalidating the abandoned token. |
| Existing local hash account | Admin issues a fresh setup/reset link. Known UUID mapping is created; passwords are not bulk copied or silently linked by email. |
| Email edited in UniAdapt | Backend synchronizes only the known provider UUID before its next password sign-in. |
| Key revoked/rotated | Replace the Worker secret securely, redeploy if required, and rerun role sign-in/reset acceptance. |
| Password changed or account banned in provider console | Revoke app sessions through UniAdapt as well. Provider changes alone do not update D1 token versions. |
| Delayed stale reset changes remote password after replacement | Login fails closed on credential-generation mismatch; issue a fresh Admin reset link to recover. Existing legitimate app sessions still use D1 token-version checks. |
| New bootstrap identity created but D1 commit fails | Backend deletes only that newly created identity; a committed Admin is retained after a lost response. Inspect redacted operator logs if compensation fails. |

The standard Admin screen does not implement Admin password recovery. Assign an operator and agree a reviewed recovery procedure before broad use. See [authentication](AUTHENTICATION.md) and [operations](OPERATIONS.md).

Supabase's default email service restricts recipients and sending rates and is unsuitable for general client invitation campaigns. If automatic email is later requested, configure custom SMTP, provider templates/URLs, delivery/error handling and consented distribution as a separate tested change. See [SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).
