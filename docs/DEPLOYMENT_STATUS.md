# Private deployment record

**Recorded:** 13 October 2026. **Release scope:** M01–M04. **Policy:** Private, owner-only; Free/minimal-cost resources only; no public deployment or paid plan purchase authorized.

## Verified resources

| Resource | Actual state |
|---|---|
| GitHub | Private `aiwithsiddhesh/uniadapt-learning`; release code/documentation in this repository |
| Cloudflare account | `f697b11b29b8426b1f0e8d419aa524e3` |
| D1 database | `uniadapt-learning`, ID `8116f300-3f0a-4216-9404-6bc49c624dc6`, APAC |
| D1 schema | Nine migrations applied through the authenticated API; Wrangler-compatible migration ledger; 25 application tables; no foreign-key violations |
| Zero Trust organization | `uniadapt-siddhesh-f697b1.cloudflareaccess.com`; four-hour session |
| Identity provider | One-time PIN, `UniAdapt email code` |
| Access application | `UniAdapt owner private`, ID `72b732d5-72a9-4bea-bff6-84301b5c8317`; exact future Worker hostname covered |
| Access allow policy | Exact email `siddhesh.ssp.parab@gmail.com` only; no Everyone/domain/Bypass rule |
| Supabase organization | `CraftedBySiddhesh's Org`, ID `enrgxenbeypysivmppti`, verified Free |
| Supabase project | Not created. Three unrelated inactive projects untouched. |
| UniAdapt Worker | Not uploaded/deployed. No server secrets configured on a live Worker. |
| Working external product URL | **None yet.** The anticipated hostname is not a delivered application. |

Existing Cloudflare `ai-training-jobs` resources and the previous private Site are unchanged. No subscription was selected or upgraded. The Cloudflare billing endpoint was not authorized, so its subscription cannot be independently certified by this connector. Verify the account remains on the intended Free plan before deployment.

## Code and source validation

The managed-auth implementation retains institution roles, academic scope, four-hour HttpOnly cookies, immediate D1 revocation, Admin-issued setup/reset links and M02–M04 domain behavior. Password processing moves to Supabase; production fails closed without its configuration. The local provider is explicitly development-only.

124 automated tests, TypeScript, production compilation, setup checks and local migration application passed. Local HTTP smoke checks also passed for Admin initialization/login, Teacher setup, role API isolation, single-use links, logout revocation and re-login. Managed authentication transport/identity tests use synthetic responses and keys. They do not certify a live Supabase project or live Worker CPU. See [validation record](VALIDATION.md).

## Remaining deployment work

1. Create/configure the dedicated Free Supabase project, obtain its modern server key securely and verify asymmetric signing.
2. Authenticate a supported artifact upload path. The Cloudflare connector can configure D1/Access, but its asset-upload operation cannot supply the required upload-session authorization. No credential bypass is used.
3. Upload the generated Worker/assets with visitor and preview URLs disabled. Set all three server secrets. Protect all Worker traffic in Access and verify its exact owner allow policy.
4. Build/check with real provider configuration, enable only the protected visitor route, and run live authentication, role, persistence, privacy and CPU checks.
5. Record the actual successful private URL, source commit, Worker deployment/version and live test results here.

The Supabase connector's `get_cost` and `confirm_cost` operations return unavailable; a valid creation confirmation cannot be obtained. Browser dashboard fallback needs the user's approval under the browser tool's plugin-fallback rule. This is an account provisioning limitation, not a failed code test.

The route must remain unavailable until private policy, provider settings and server secrets are verified. A historical Site URL, placeholder Worker, anticipated hostname or successful build must not be reported as the deployed product.
