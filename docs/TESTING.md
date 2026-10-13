# Testing, verification and client acceptance

## Evidence and its limits

The M01–M04 implementation baseline passed **99 automated tests**, TypeScript checks, the production build and live read-only health/authentication-boundary probes on 13 October 2026. Automated tests use synthetic data; SQLite fixtures approximate D1 transactions. A 2,000-record foundation test verifies import/allocation and bounded statements, not production throughput or 2,000 simultaneous learners.

This handover adds and checks local setup helpers, migration commands and documentation examples. Browser/manual client UAT, accessibility, penetration assessment, real external infrastructure and production concurrency/performance remain unverified. Record new results against the exact GitHub commit; do not copy the baseline as evidence for a different deployment.

## Automated commands

After [Setup](SETUP.md):

```bash
pnpm test
pnpm typecheck
pnpm build
```

Expected: all 99 delivered business tests pass, typecheck exits zero and build produces the Worker/client output. Node warnings about experimental/native APIs are not by themselves test failures; inspect exit code and failure summary. `pnpm lint` is available for an additional review, but no passing lint baseline is claimed. No Playwright browser suite or coverage-percentage threshold is supplied.

| Suite | What it verifies |
|---|---|
| `tests/access.test.mts` | Sessions, revocation, role/owner authorization, question release and assigned assessment boundaries |
| `tests/academic.test.mts` | Academic paths, offerings, ownership, weights, allocation/capacity and history |
| `tests/foundation.test.mts` | M01–M04 additions: accounts/tokens, CSV, atomic rollback, bulk transfer/closure, Unit versions, calendar/DST/deadlines and 2,000-record foundation data |
| `tests/scope.test.mts` | Historical Teacher cannot access transferred Student's new Section/preferences/unassigned deficit |
| `tests/migration.test.mts` | Existing accounts/tokens/academic references survive additive upgrades; foreign keys remain valid |
| `tests/dashboard.test.mts` | Server-rendered role navigation excludes other workspaces; not click/visual browser testing |
| `tests/learning.test.mts` | Existing objective practice, evidence, planning, approval, note helper and persistence/revision behavior |

Run a specific suite while debugging, for example `node --test tests/foundation.test.mts`. Do not change tests merely to suppress a real failed rule.

## Local configuration and migration checks

```bash
pnpm setup:local
pnpm check:setup
pnpm db:migrate:local
pnpm db:migrate:local
pnpm db:check:local
pnpm exec wrangler d1 execute DB --local --config wrangler.local.json --persist-to .wrangler/state --command "PRAGMA foreign_key_check"
```

The second migration run should report no outstanding migrations. Check for 25 application tables plus migration/provider metadata and no foreign-key violations. Confirm `.dev.vars`, `.wrangler/`, backups and `node_modules` are ignored. Verify rerunning setup preserves the existing secret; no value should appear in command output.

## Runtime smoke check

With the local dev server running, open `/api/health` on its printed local origin. A ready response contains:

```json
{
  "status": "ready",
  "storage": "connected",
  "assessment": "passed",
  "planning": "passed",
  "roles": "passed",
  "authentication": "passed",
  "academicEnrollment": "passed",
  "calendar": "passed"
}
```

The probe checks table presence and synthetic runtime/domain fixtures; it does not authenticate real role accounts or verify browser workflows, backups or load. A 503 is not ready. On the hosted Site the outer Sites audience gate still applies; do not circulate internal bypass credentials to run health checks.

Without an institution session, `/api/academic`, `/api/accounts` and `/api/campus` should return 401 after reaching the app. A logged-in Teacher/Student should receive 403 for Admin academic/account routes. The native Sites gate can intercept requests earlier, so distinguish platform access denial from an application status.

## Manual acceptance fixture

Use a separate local/staging database with no real Student data. Create:

- One Admin, one Subject Owner Teacher, one CO Teacher and two Students, plus an unrelated Teacher/Section for isolation checks.
- `ENG → BE → 2026 → Semester 1 → Sections A/B`, with actual valid term dates.
- Core Theory Subject `CS1`, Core Lab `LAB1`, and two alternative Electives in one required group (for example `OE1`/`OE2`).
- Matching active offerings, capacities sufficient for the positive cases, PRIMARY/CO assignments and one shared Subject Owner.
- One Unit at 100% initially; an approved topic with notes and sufficient Easy/Medium/Hard questions for the selected flow.
- Working weekdays, one holiday, a valid University window/exam and a class/lab row.
- Student availability that both includes and conflicts with official commitments.

Adjust dates to the test day. Do not use the fixed 2026 example path with an out-of-term current date for a future-learning test.

## Manual test cases

All rows below are **to execute**, not pre-recorded passes. Capture result, commit, environment, browser/version, tester, date and redacted evidence.

| ID | Steps | Expected result |
|---|---|---|
| AUTH-01 | Initialize fresh institution, then attempt another bootstrap | First Admin succeeds; second initialization rejected |
| AUTH-02 | Activate Teacher/Student; login by email and username | Correct role workspace; no cross-role menu |
| AUTH-03 | Wrong/inactive credentials; exceed configured failed limits | Generic credential rejection; applicable throttle response |
| AUTH-04 | Use setup link, reuse it; generate replacement and try old link | Single consumption; used/replaced link fails |
| AUTH-05 | Log in on two sessions; logout/reset/revoke/deactivate | Earlier institution JWT sessions fail immediately on next request |
| AUTH-06 | Attempt Admin APIs as Teacher/Student; inspect Student responses | 403; no draft bank, withheld keys or peer identities |
| ADM-01 | Create full hierarchy; invalid parent, duplicate code, invalid range/capacity | Valid path saved; invalid inputs identified without partial records |
| ADM-02 | Try deactivating a parent with active dependents; close/deactivate safely | Unsafe operation blocked; valid historical references retained |
| SUB-01 | Invalid Unit total; Subject/Section mismatch; missing PRIMARY/Owner | Save/activation rejected; valid owned offering succeeds |
| SUB-02 | CO edits shared draft, then tries activation; Owner activates | CO edit permitted; activation Owner-only; Section data remains scoped |
| CSV-01 | Import mixed valid/invalid rows; download results; repeat valid identities | Row-specific reasons; valid records only; no duplicate active enrollment |
| CSV-02 | Wrong roll/email reference, missing required elective, capacity overflow | No partial records for rejected row |
| ENR-01 | Preview transfer; modify structure in another session; confirm old preview | Stale preview rejected; regenerated valid transfer keeps history |
| ENR-02 | Bulk promotion and placement closure; inspect old attempts/feedback | Atomic complete group; historical records retained |
| ENR-03 | Introduce planned required elective offerings for placed Students | Combined preview reviewed before authoritative activation/allocation |
| CAL-01 | Save holidays/windows; exam outside window/term or reversed range | Valid calendar saved; invalid exact event rejected |
| CAL-02 | Overlap mandatory class/lab/exam or same facilitator; adjacent slots | Overlap rejected; valid adjacency accepted |
| CAL-03 | Change timezone / use ambiguous or missing DST local minute | UTC instants retained and revalidated; ambiguous/missing minute rejected |
| PLN-01 | Save availability overlapping holiday/class/lab/exam; inspect plan | No double booking; no future study block extends beyond exact exam start |
| PERSIST-01 | Reload/restart and reopen same environment | Accounts/academic records and learning data retained |
| RECOVER-01 | Restore an isolated backup and reconnect staging | Counts/references/roles verified; production unaffected |

Test Student feedback/history and Teacher assignment boundaries in separate browser profiles or isolated sessions. Signing out invalidates the institution account's other active sessions; plan multi-session revocation tests deliberately.

## Wider acceptance still required

Keyboard/screen-reader behavior, mobile layouts, long names/errors, slow/interrupted requests, real D1 contention, realistic learning-cache growth, backup restore and client access after hosting migration need additional validation. Plan full SRS tests for later modules only as they are implemented; manual scenarios for existing partial flows do not establish completion of M05–M18.

## Defect and sign-off records

Use this issue format: role + screen; commit/environment; numbered reproduction steps; expected result; actual result/status; redacted screenshot/log; impact; frequency. Keep passwords, session cookies, setup/reset URLs and real Student exports private.

Acceptance is completed only when the authorized client reviewer executes the agreed tests and records outcomes in [Client handover](CLIENT_HANDOVER.md). Unexecuted cases stay pending. Suggested CI gates are locked dependency installation, `pnpm test`, `pnpm typecheck` and `pnpm build`; automatic deployment/CI workflow is not configured in this repository by this handover.
