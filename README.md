# UniAdapt — Academic and Adaptive Learning Platform

UniAdapt connects an engineering college's academic structure, teaching progress and learner evidence to an individual study plan. Administrators manage authoritative enrollment and calendars; Teachers prepare and approve learning material; Students access their assigned subjects, assessments and study schedule.

This is an independently built implementation of the UniAdapt concept and specification. The reference application's source code and architecture were not reused.

> **Delivery status:** M01–M04 functionality is implemented. Later learning modules have working subsets and outstanding requirements. This is a foundation release for technical handover and client acceptance testing, not a claim that the complete AI product or production readiness has been delivered.

## Project overview

| Item | Current position |
|---|---|
| Users | Engineering colleges; Admin, Teacher and Student accounts |
| Delivered foundation | Authentication, hierarchy, Subject/Student allocation, calendars and timetable |
| Additional working flows | Manual material/question authoring, approval, coverage, objective practice, learner evidence and planning |
| AI integration | Not implemented; no LLM provider, embeddings or vector database is configured |
| Application | React 19, TypeScript, Vinext/Vite and Cloudflare Workers |
| Database | Cloudflare D1; Drizzle schema; seven delivered SQL migrations |
| Authentication | Sites access gate plus institutional bcrypt/four-hour JWT accounts |
| Hosting | Owner-private ChatGPT Sites; additional client access requires authorization |
| Validation baseline | 99 tests, TypeScript checks, production build and live health checks passed on 13 October 2026 |
| Acceptance outstanding | Browser/accessibility, client role tests, backup restore and production load/concurrency validation |

**Source:** [Private GitHub repository](https://github.com/aiwithsiddhesh/uniadapt-learning)
**Deployment:** [Private UniAdapt Learning Campus](https://uniadapt-learning.siddhesh-ssp-parab.chatgpt.site)

Receiving this repository or an institution setup link does not grant access to the owner-private website. GitHub pushes do not automatically update the deployed Site.

## Client and developer documentation

| Task | Guide |
|---|---|
| Review deliverables, responsibilities and acceptance | [Client handover](docs/CLIENT_HANDOVER.md) |
| See completed, partial and planned work | [Module status and roadmap](docs/ROADMAP.md) |
| Install and run the product locally | [Setup](docs/SETUP.md) |
| Create an external database and manage migrations | [Database](docs/DATABASE.md) |
| Configure authentication and accounts | [Authentication and security](docs/AUTHENTICATION.md) |
| Operate Admin, Teacher and Student workflows | [User guide](docs/USER_GUIDE.md) |
| Run tests and verify functionality | [Testing and verification](docs/TESTING.md) · [Recorded evidence](docs/VALIDATION.md) |
| Deploy, back up, recover and maintain | [Deployment and operations](docs/OPERATIONS.md) |
| Understand architecture, routes and integrations | [Architecture and API](docs/ARCHITECTURE.md) |

## How the product works

1. Admin initializes the institution, timezone and Department → Program → Batch → Semester → Section hierarchy.
2. Admin creates Teacher accounts, Subjects and Units, maps Section offerings, and assigns PRIMARY/CO Teachers and one Subject Owner.
3. Admin configures working days, holidays, exam windows, exact exams and class/lab timetable.
4. Admin previews Student import or placement, resolves capacity/elective errors and confirms authoritative enrollment.
5. Teachers prepare topics, notes and objective questions. The Subject Owner activates reviewed material and the bank. Teachers record actual Section coverage.
6. Students activate accounts, enter study availability, access approved material, take practice/assigned assessments and review their plan and feedback.

Students cannot add or drop their own Subjects. Completing a study slot records activity; it does not itself increase knowledge mastery.

## What is implemented

| Module | Delivered functionality | Verification / qualification |
|---|---|---|
| **M01 — Authentication & User Management** | Email/optional username login; bcrypt; four-hour JWT; one role; account updates, activation/deactivation, revocation, single-use setup/reset links, throttling and scoped access | Token, authorization, rollback and SQL isolation tests; Sites audience is a separate access layer |
| **M02 — Institution & Academic Setup** | Institute identity, active state, timezone and authentication policy; hierarchy CRUD and safe deactivation | Hierarchy/reference/date/capacity tests |
| **M03 — Subject & Student Allocation** | Catalogue, Unit policy versions, Section offerings, PRIMARY/CO assignments, Subject Owner, CSV import, electives and atomic placement/promotion/transfer with history | Mixed CSV failures, ownership, capacity, stale-preview and 2,000-record foundation tests |
| **M04 — Calendar & Timetable** | Working days, holidays, typed exam windows, exact exam instants, recurring class/lab rows, facilitator checks, snapshots and planner constraints | Calendar, DST, overlap, deadline and no-double-count tests |

[M05–M18 status](docs/ROADMAP.md) is documented individually. Visible screens do not establish full SRS implementation. The Course helper currently retrieves approved note paragraphs using deterministic text matching; it is not an LLM or RAG service.

## Quick start for developers

Use a local machine with Git, **Node.js 22.13 or later** and **pnpm 11.25.0**. The recorded validation environment used **Node.js 24.19.0**. Use WSL on Windows for shell-based helpers.

```bash
git clone https://github.com/aiwithsiddhesh/uniadapt-learning.git
cd uniadapt-learning
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm setup:local
pnpm check:setup
pnpm db:migrate:local
pnpm db:check:local
pnpm dev
```

Open the local URL printed by the server, normally `http://localhost:5173`. Complete **local Sites sign-in**, then **Initialize your institution**. Local Sites sign-in is a loopback-only development mock; the institution password still uses the real authentication code. See [Setup](docs/SETUP.md) for persistence, troubleshooting and production-build limitations.

```bash
pnpm test
pnpm typecheck
pnpm build
```

`setup:local` generates an ignored `.dev.vars` secret without printing it and preserves an existing file. Local migration commands never create a cloud database. The [external D1 procedure](docs/DATABASE.md#creating-a-client-owned-cloudflare-d1-database) is separate.

## Database, authentication and hosting

| Concern | Current implementation | Client action |
|---|---|---|
| Database | D1 binding `DB`; 25 application tables; learning-state JSON cache | Keep Sites-managed storage, or provision client-owned D1 and complete host migration |
| Authentication secret | `UNIADAPT_AUTH_SECRET` in provider secret storage | Arrange secret administration and environment-specific values through secure channels |
| User identity | Built-in institution accounts | Identify client Admin and distribute setup/reset links privately |
| Website access | Sites owner-private audience | Authorize client access or implement a standalone access provider |
| AI | No provider integration | Agree provider, budget and data handling, then implement missing agents |
| Backups/monitoring | Provider capabilities; no scheduled app backup job | Assign operations ownership and validate the runbook |

**A `DATABASE_URL` or Supabase key does not connect this build to another database.** It calls D1 directly through the Worker binding. Generic hosting also does not replace the Sites identity gate. The guides distinguish supported setup from required migration work.

## Repository structure

| Path | Responsibility |
|---|---|
| `app/` | Role workspaces, account/academic controls and API routes |
| `lib/academic*.ts`, `lib/calendar.ts`, `lib/student-import.ts` | Academic domain, calendar and CSV rules |
| `lib/auth.ts`, `lib/account-admin.ts`, `lib/access.ts`, `lib/scoped-store.ts` | Sessions, accounts, authorization and scoped queries |
| `lib/engine.ts`, `lib/grading.ts`, `lib/store.ts` | Learning/planning behavior and persistence |
| `db/schema.ts`, `drizzle/` | Schema and ordered migrations |
| `tests/` | Domain/integration tests and role rendering checks |
| `build/`, `vite.config.ts` | Worker/framework and Sites integration |
| `scripts/` | Install/build helpers and setup checks |
| `wrangler.local.json` | Local DB administration; not production deployment |
| `docs/` | Client handover, setup, usage, testing and operations |

## Known limits

- The full 18-module SRS, six AI agents, PDF/OCR ingestion, embeddings, real RAG, advanced grading and historical institution reports remain outstanding.
- The learning cache has a **1,500,000-byte save limit**. A 2,000-record import/allocation test does not prove 2,000 active learners fit the cache or meet production throughput targets.
- Browser/accessibility and production load/concurrency acceptance are unverified. `pnpm lint` exists but was not a recorded passing release gate.
- Hosting ownership, client audience, domain/billing control and backup access have not been transferred by creating this repository.
- There is no root project license granting public redistribution. Retain third-party licenses; agree client ownership and redistribution terms separately.

## Requirements and support

Concept source: [UniAdapt reference repository](https://github.com/leeshaparab1922-crypto/uniadaptfake), **UniAdapt AI — Business and Software Requirements Specification**, version 0.0, dated 13 September 2026. The audit used the retrieved baseline on 13 October 2026. Its exact source revision is not embedded in this handover; retain an agreed versioned SRS before accepting later module scope.

Foundation traceability: **FR-AUTH-001..004** and **FR-ADM-001..007**. Prerequisite diagnostics (**FR-ADM-008**) and institution reports (**FR-ADM-009**) belong to later modules and remain incomplete.

For development changes, follow [CONTRIBUTING.md](CONTRIBUTING.md).

Assign a product owner, technical maintainer and operations owner through the [handover checklist](docs/CLIENT_HANDOVER.md). Raise reproducible bugs in repository issues with role, steps, expected/actual behavior and redacted evidence. Credentials and real Student records should not be attached to issues.
