# Module status and implementation roadmap

Baseline: concept/SRS version 0.0; source audit and technical evidence dated 13 October 2026. Status labels describe functional scope, not client acceptance or production readiness. No percentage-complete or delivery date is inferred from screen count.

## Module-by-module status

| ID | Module | Status | Working scope | Outstanding scope |
|---|---|---|---|---|
| M01 | Authentication & User Management | Foundation functionality implemented | Accounts, bcrypt/JWT, reset/revocation/throttling, role/scope queries | Independent security/client/browser acceptance; standalone host identity integration |
| M02 | Institution & Academic Setup | Foundation functionality implemented | Hierarchy, Institute/timezone/policy, validation, deactivation | Client hierarchy/data acceptance |
| M03 | Subject & Student Allocation | Foundation functionality implemented | Catalogue/Units, owner/Teachers, offerings, CSV/electives, placement/promotion/history | Client allocation/data acceptance and realistic capacity evaluation |
| M04 | Calendar & Timetable | Foundation functionality implemented | Calendar/windows/exams, recurrence, facilitator validation, versioning and planning constraints | Client calendar acceptance and browser/real-D1 validation |
| M05 | Content Management | Partial | Manual notes, text/Markdown import, approval drafts and retained artifact snapshots | PDF/OCR, original file storage, ingestion/chunks/embeddings, full rollback/version workflow |
| M06 | Curriculum & Topic Graph | Partial | Manual topics/Unit links, prerequisite validation and Owner approval | AI extraction, specified generation/review/fallback workflow and full graph/version policies |
| M07 | Question Bank | Partial | Manual four-choice objective items, difficulty/explanations, approval gates | AI generation/Critic, all question schemas/Bloom, sampling, exact exposure/item-quality policies |
| M08 | Coverage Tracker | Partial | Four topic states, Teacher pins and Section-scoped changes | Complete Unit bulk workflow, ClassSession/attendance and specified alerts/history behavior |
| M09 | Diagnostic Assessment | Partial | Assigned timed checkpoints/prerequisite screen, item selection and held/released feedback | Earlier-semester prerequisite sources, full versioned blueprints, exposure/selection/stop/window rules |
| M10 | Grading | Partial | Single-correct objective grading and finalized evidence | Numerical/coding/subjective grading, moderation, appeals and complete common grading contract |
| M11 | Learner Model | Partial | Objective evidence, confidence/mastery display and revision triggers | Exact complete evidence-status/version model, attendance, Engagement Score and all specified policies |
| M12 | Adaptive Study Planner | Partial | Shared half-hour capacity, priorities/prerequisites, deficit/TRIAGE, revisions and official calendar/exam constraints | Remaining preferences/versioning/cycle fallback, scheduling/nightly behavior and exact full SRS acceptance |
| M13 | Daily Learning | Partial | Study plan, approved notes, completion/reopening and CSV views | Complete specified daily/weekly/versioned content and learning-event workflow |
| M14 | RAG Tutor | Partial helper only | Approved-note paragraph retrieval/refusal and existing session restrictions | LLM integration, embeddings/vector retrieval, full grounding/similarity guards; real RAG not implemented |
| M15 | Practice & Quiz | Partial | Objective practice and assigned diagnostic attempts | Teacher-configured quiz workflow and complete exposure/selection/review policy |
| M16 | Recommendation | Pending full implementation | No complete approved-resource ranking pipeline | Topic-mapped resource management, ranking, weak-topic recommendation acceptance |
| M17 | Intervention | Partial | Teacher-authored supportive learner action | Automated Teacher-first evidence queue, review/notification escalation and specified agents |
| M18 | Dashboards, Notifications & Reports | Partial | Role workspace views and limited plan/progress/CSV reporting | Persistent notification system, daily snapshots, institution rollups/privacy suppression, PDF/Excel reports |

All **six AI agents** are pending. There are no runtime provider calls/keys or provider-neutral agent orchestration in the delivered implementation. The helper's text matching should not be sold as AI-generated tutoring.

## Foundation traceability

| Requirement | Implemented area | Primary evidence |
|---|---|---|
| FR-AUTH-001 | Active login, four-hour JWT and immediate token-version revocation | `auth.ts`; access/foundation tests |
| FR-AUTH-002 | Admin/Teacher/Student route and data scope | `access.ts`, `scoped-store.ts`; scope/access tests |
| FR-AUTH-003 | Identity/profile/account lifecycle and valid role references | `account-admin.ts`; foundation tests |
| FR-AUTH-004 | Hashed single-use links, expiry/replacement and account/IP throttling | `auth.ts`; token/rollback tests |
| FR-ADM-001 | Institute and academic hierarchy | `academic.ts`; hierarchy tests |
| FR-ADM-002..004 | Subjects/Unit policy, Teachers/Owner and Section offerings | Academic domain/store and allocation/version tests |
| FR-ADM-005 | CSV mixed successes/failures and idempotent import | `student-import.ts`; foundation tests |
| FR-ADM-006 | Authoritative enrollment/electives and preview/confirm transfer | Academic store; capacity/history/bulk tests |
| FR-ADM-007 | Calendar/exams/timetable and planner inputs | `calendar.ts`, `engine.ts`; calendar/DST/deadline tests |

FR-ADM-008 prerequisite diagnostics and FR-ADM-009 institution reporting are later M09/M18 work, not completed foundation requirements. Full original acceptance criteria must remain the target; these notes do not approve exclusions.

## Suggested next phases

| Phase | Goal | Dependency / exit evidence |
|---|---|---|
| 1. Client acceptance and operations | Client access/ownership decision, synthetic role UAT, backup restore, browser/accessibility baseline | Foundation accepted against exact commit; operations owner identified |
| 2. Content and AI foundation | File storage/ingestion/versioning, approved provider policy, safe agent outputs, curriculum and question review | Validated ingestion and Owner activation; provider failure/refusal tests |
| 3. Assessments and learner evidence | Complete diagnostic/quiz/grading/coverage/attendance and evidence model | SRS blueprints/exposure/grade/evidence tests before production learners |
| 4. Planning and Tutor completion | Remaining planner/version/scheduler policies and actual RAG | Scenario acceptance for capacity/priority/grounding/assessment guardrails |
| 5. Recommendations and institutional reporting | Approved resources, interventions, notices, snapshots and exports | Privacy/group suppression, notification and report reproducibility tests |
| 6. Production scale and governance | Learning-data normalization, retention/disposal, load/security and disaster recovery | Real target-volume/concurrency and restore results; agreed operating controls |

Detailed scope, priority, owner, estimate and schedule require an agreed client backlog. No maintenance SLA, provider cost cap, completion date or fixed price is supplied by this source-code handover.

## Decisions required before a production client release

Select Sites-hosted access versus standalone migration; identify the authoritative SRS revision; assign product/operations/data owners; choose AI provider/data policy only when AI implementation begins; define realistic concurrent usage and evidence-retention expectations; agree support and acceptance criteria. These are decisions to record, not automatically approved changes to the current private deployment.
