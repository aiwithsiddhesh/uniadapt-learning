# UniAdapt Learning Campus

Independently built from the UniAdapt concept and SRS. The reference repository application code and architecture were not reused. This release completes the functional implementation of M01–M04; the complete SRS remains the target for subsequent modules.

## M01 — Authentication and user administration

Exactly one ADMIN, TEACHER or STUDENT role per account. Email or optional username login uses bcrypt and a four-hour JWT in Secure/HttpOnly/SameSite cookies, with no refresh tokens. Protected requests verify active state and token version. Logout, reset, deactivation, identity/role/scope edits and explicit Admin revocation invalidate old sessions. Admin can create, view and edit identities, Department profiles and permitted roles, link Student records, activate/deactivate accounts, issue expiring setup/reset links and revoke sessions. Role changes cannot orphan academic responsibilities. The sole Admin role cannot be removed.

Setup/reset links use random tokens stored only as hashes, expire after 24 hours, replace earlier links and are consumed transactionally with the password update and audit. Account/IP-aware failed-attempt limits and their window are configurable in Institute settings; email/username aliases share the account bucket. No plaintext password or credential is committed, logged or returned. Links are delivered through the Admin's chosen private channel; automatic email delivery is not required by the SRS.

Role-specific SQL projections return only permitted Subjects, rosters, attempts, evidence and plan data. Student projections exclude banks, draft/history artifacts, answer keys and peer session identities; response shaping applies release/ownership gates. Historical Teacher access excludes a transferred Student's new Section, current preferences and unrelated deficit totals. Mutation authorization runs before a full-state internal domain write. CO Teachers edit shared drafts; only the designated Subject Owner approves them.

## M02 — Academic hierarchy

Institute identity, active state, IANA timezone and authentication policy are editable. Department → Program → Batch → Semester → Section records support create/view/edit and safe deactivation, with parent references, scoped uniqueness, valid years/dates and capacities. Closing current Student placements preserves history and frees capacity before dependent records are deactivated. Historical records remain referentially intact.

## M03 — Subject catalogue and allocation

Program/Semester Subjects store code/name/credits, Core Theory/Core Lab/Elective type, required/optional elective grouping and Unit weights totaling 100%. Section offerings validate their Program/Semester path, DRAFT/ACTIVE status, capacity, PRIMARY/CO assignments and one shared Subject Owner who is PRIMARY on at least one active offering. Multiple PRIMARY Teachers are supported independently of the single Owner.

Admin previews and confirms individual or bulk placement/promotion/transfer. Core and Admin-chosen elective enrollments are authoritative, idempotent and capacity checked; exactly one choice is required per required group. One transaction commits the complete bulk operation and closes old enrollments while retaining attempts, evidence and placement history. A live attempt blocks incompatible changes. Placement closure retains the record and all history, and supports subsequent re-enrollment. Planned elective offerings can be activated together with capacity-aware proposed allocations reviewed by Admin, avoiding a dependency deadlock for existing Students.

CSV import accepts up to 2,000 rows and a 2 MB UTF-8 file. Required headers are roll_no,name,email,department,program,batch,semester,section; electives is optional and uses semicolon-separated Subject codes. Codes and Section names resolve through a valid scoped hierarchy. Preview shows row errors and assigned subjects before confirmation. Valid rows commit together; invalid rows produce no accounts or academic records. Existing Student identities update without duplicate enrollment. All row results can be downloaded.

Unit-policy versions retain immutable previous Unit snapshots. Changes preserve the approved curriculum and create a replacement review draft; the Subject Owner activates the new Unit reference after review. Shared material activation propagates across Section offerings; actual coverage, pins, rosters and timetables remain scoped. Starter material is explicitly labeled and may be copied into an unapproved Program-scoped Subject.

## M04 — Calendar, exact exams and timetable

Each Semester has a versioned working-day/holiday calendar and IA/PRACTICAL/UNIVERSITY windows. Exact exam events are stored as UTC instants from Institute-local inputs, validated against term/window/holiday constraints. Ambiguous or nonexistent local times at daylight-saving transitions are rejected. Timezone changes retain exam instants, revalidate local dates and record a new calendar snapshot. Timed university deadlines are edited through exact exam events to keep one authority.

Recurring Section class/lab rows have effective date ranges, local start/end, offering and teaching facilitator. Validation rejects overlapping mandatory commitments for Students or an actual assigned facilitator; mutually exclusive elective choices can run in parallel without falsely creating a mandatory Student overlap. Adjacent rows are valid. Corrections/removal retain configuration snapshots and actor/time audit.

The planner reads normalized constraints, includes mandatory labs even though Core Lab topics are excluded from theory planning, removes holidays/nonworking days/classes/labs/exams, counts shared free blocks once, spans the complete deadline horizon and stops learning/revision blocks before exact exam start. Existing date-only deadlines conservatively exclude their whole exam day until official times are entered. Calendar snapshots preserve their timezone, windows, exam instants and timetable inputs.

## Validation and hosting

Run node --test tests/*.test.mts, then node node_modules/typescript/bin/tsc --noEmit. The automated suite covers role/token boundaries, SQL isolation, atomic rollback, hierarchy/Unit/capacity constraints, CSV mixed failures, bulk transfer/closure, a 2,000-record foundation dataset, timezone/DST handling, calendar overlaps, exact deadlines and existing-data migrations. This is functional/integration evidence; browser/accessibility validation and production concurrency/performance acceptance remain unverified.

D1 is bound as DB. Academic/auth data uses 25 tables; the existing learning-state cache is still a JSON row with a 1.5 MB limit. UNIADAPT_AUTH_SECRET lives in Sites secret storage. Only the supported owner-private deployment operation is authorized. Hosting remains owner-only; institution setup links do not grant Sites access to additional people. Additional private viewers require separately authorized hosting access.

## Remaining SRS work outside M01–M04

M05–M18 remain partially implemented or pending as applicable: file ingestion/OCR/chunks/embeddings and content versions; all six provider-neutral AI agents; complete curriculum/question types/Bloom/critique/sampling/exposure/item analysis; earlier-semester prerequisite diagnostics; numerical/coding/subjective grading and moderation/appeals; attendance and Engagement Score; complete learner evidence-status/version handling; remaining planner preference/cycle-fallback/versioned/nightly requirements; Teacher quizzes; real RAG and similarity guards; recommendations and automated Teacher-first intervention queues; notifications, daily historical reports and PDF/Excel exports. Full learning-data normalization, retention/backup/disposal, accessibility and the SRS load/concurrency targets remain pending. These are outstanding requirements, not approved exclusions.
