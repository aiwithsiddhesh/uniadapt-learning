# Client handover and acceptance record

**Product:** UniAdapt — academic and adaptive learning foundation
**Handover documentation date:** 13 October 2026
**Repository:** [private UniAdapt source](https://github.com/aiwithsiddhesh/uniadapt-learning)
**Business release:** M01–M04 functionality; later modules partial/pending
**Client / authorized reviewer / acceptance date:** To be completed by the parties

## Executive overview

UniAdapt organizes a college's academic structure and authoritative Student enrollment, gives Teachers assigned operational access and material approval responsibilities, and supplies Students with approved learning/assessment/planning flows. The foundation is implemented; full agentic content generation, RAG tutoring, advanced assessment/grading and institution reporting remain development work.

This package delivers source and operating documentation. It does not by itself grant repository/website access to the client's staff, transfer hosting/billing ownership, set a maintenance SLA or certify production readiness. Those are explicit handover actions below.

## Deliverable inventory

| Deliverable | Location / evidence |
|---|---|
| Application and role workspaces | `app/`, `lib/`, `components/` |
| Academic/auth schema and nine migrations | `db/schema.ts`, `drizzle/` |
| Dependency/build configuration | `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `build/`, `scripts/` |
| Business test suite | `tests/`; 124 current tests (99 foundation/learning, seven standalone gateway/bootstrap and 18 managed-auth tests) |
| Professional project entry point | `README.md` |
| Setup and safe local configuration tools | `docs/SETUP.md`, `setup:local`, `check:setup`, local D1 commands |
| External database and auth guides | `docs/DATABASE.md`, `docs/AUTHENTICATION.md`, `docs/SUPABASE_SETUP.md`; non-secret templates |
| End-user operating guide | `docs/USER_GUIDE.md`, synthetic CSV example |
| Testing / client acceptance plan | `docs/TESTING.md` and this record |
| Deployment, backup and incident runbook | `docs/OPERATIONS.md` |
| Implemented/planned scope | `docs/ROADMAP.md` |
| Architecture and API contract | `docs/ARCHITECTURE.md` |

Not supplied in Git: passwords, hosting/API tokens, session signing secret, setup links, real database exports, original client documents or production Student data. These must be handled through agreed authorized channels where needed.

## Acceptance boundary

Accept the foundation against FR-AUTH-001..004 and FR-ADM-001..007 and the agreed detailed SRS acceptance criteria. Use the role/database/calendar scenarios in the Testing guide. Record later module subsets separately; visible partial features are not full SRS acceptance.

| Area | Recorded engineering evidence | Client acceptance |
|---|---|---|
| Authentication/scoped access | Automated token/role/query tests | Pending real role/browser execution |
| Hierarchy/allocation/import | Domain/integration tests, including 2,000 foundation records | Pending client data/rules review |
| Calendar/planning constraints | Calendar/DST/deadline tests | Pending client's actual academic schedule |
| Production build/live baseline | Passing compilation and read-only runtime probes for existing private Site | Pending client environment/access confirmation |
| Local setup | Secret/config helpers and local D1 migrations checked in handover | Pending fresh client-machine install and browser walkthrough |
| Backup/restore | Procedure documented | No client/provider recovery acceptance recorded |
| Performance/accessibility/security assessment | No completed independent acceptance evidence | Pending |
| Full AI/SRS modules | Explicit gaps listed | Not delivered as complete |

## Handover checklist

- [ ] Client receives authorized access to the private repository; appropriate staff roles agreed.
- [ ] Exact accepted source commit and versioned SRS retained in the client records.
- [ ] Client product owner, institution Admin, maintainer and operations/data owners named.
- [ ] Hosting strategy agreed: complete the prepared standalone Cloudflare deployment.
- [ ] Client can reach the agreed private application and sign in; all three roles verified independently.
- [ ] D1 and dedicated Supabase ownership/bindings and key administration recorded; backup/export access verified.
- [ ] Secret ownership/rotation and account reset procedures agreed without publishing values.
- [ ] First client academic hierarchy, catalogue, ownership and calendars approved.
- [ ] Student import/elective/transfer workflow tested with synthetic and then approved client data.
- [ ] Browser/mobile/accessibility, backup restore and realistic load acceptance completed.
- [ ] Demonstration content/learner handled through an agreed clean-environment procedure.
- [ ] Outstanding scope, prioritized backlog and change/acceptance process accepted.
- [ ] Support/maintenance, billing, retention/offboarding and ownership/license terms agreed separately.

Do not check these items merely because the source repository exists.

## Responsibility matrix

| Responsibility | Client role to nominate | Implementation/operator support |
|---|---|---|
| Requirements, priorities and acceptance | Product owner | Maintainer provides evidence and gap mapping |
| Academic structure/Teachers/Students | Institution Admin | Maintainer diagnoses product defects |
| Curriculum/bank approval | Subject Owner Teachers | Domain rules enforce ownership |
| Host, billing, secrets, backup, incidents | Operations/infrastructure owner | Maintainer implements/configures agreed integrations |
| Student-data access/retention/disposal policy | Client data owner | Missing controls added through backlog |
| Dependencies/tests/releases | Technical maintainer | Client approves production release process |

Names, support hours and response times are intentionally unspecified until agreed. No automatic maintenance or legal ownership transfer is implied by this document.

## Priority gaps before broad production use

Host/client-access ownership; operational backup restore; independent security/browser/accessibility tests; realistic storage/concurrency validation; documented Admin recovery; complete clean-data/retention controls. Standalone identity/Worker code is prepared; D1 and owner-only Access are provisioned; dedicated Supabase project, server secrets and Worker deployment remain pending. Follow the standalone guide. Broader product scope additionally needs all pending agents and M05–M18 requirements.

## Sign-off template

| Field | To record |
|---|---|
| Accepted GitHub commit / deployed version | Exact SHA and environment version |
| Accepted scope | Requirement/module IDs; explicitly agreed exclusions, if any |
| Test evidence | Executed case IDs/results, date, tester, browser and environment |
| Outstanding defects | Severity, owner and agreed disposition |
| Pending features/operations | Backlog IDs and ownership |
| Access/asset handover | Repo, host, DB, domain, billing and secret administration status |
| Client reviewer / technical owner | Names and confirmation date |

No client sign-off is recorded by the assistant. Keep completed acceptance records and any signed commercial agreement in the client's approved private document system.
