# Product usage guide

Use synthetic data for evaluation. Website access and institution credentials are separate; read [Authentication](AUTHENTICATION.md) if a setup link or login is blocked.

## Workspace by role

| Role | Navigation | Responsibility |
|---|---|---|
| Admin | Academic structure, Campus & courses, Learners & enrollment, User accounts, Prerequisite diagnostics | Accounts, academic authority, allocation and scheduling |
| Teacher | Curriculum & materials, Question bank, Classroom coverage, Diagnostic sessions, Learner insights | Assigned offerings, material preparation, teaching progress and learner support |
| Student | Overview, My study plan, My courses, Assigned assessments, My progress, Course helper, Study availability | Own material, practice/assessments, availability and learning record |

The signed-in account determines its workspace. Sign out to test another account. Admin access does not mean switching into every role dashboard.

## Admin first-time setup

### 1. Institute and hierarchy

Open **Academic structure → 1. Hierarchy**.

1. Save Institute name/code, IANA timezone and authentication attempt limits. For an India-based college, use `Asia/Kolkata`.
2. Add Department, then Program with its number of semesters.
3. Add Batch with valid start/end years.
4. Add Semester with its number and actual term dates.
5. Add Section with a positive Student capacity.

Example evaluation path: Department `ENG` → Program `BE` → Batch `2026` → Semester `1` → Section `A`. Create Section `B` for transfer tests. Select dates matching the evaluation period; future-learning flows require a future exam deadline.

Codes must be unique within their defined parent/scope. Parent paths cannot be arbitrarily changed after dependent records exist. Deactivate dependent records/close current placements before safely deactivating parents. Retained history remains readable within authorized scope.

### 2. Teacher accounts

Open **User accounts**. Create Teachers with names, unique email/optional username, role and valid Department profile. Deliver each setup link privately. Inactive/setup-pending accounts are labeled. Account Department metadata does not grant access to all Department courses; offering assignments define Teacher access.

### 3. Catalogue and Unit policy

Open **Academic structure → 2. Subject catalogue**. Select Program and Semester number; enter code, name, credits and type:

- **Core Theory:** automatically allocated to placed Students through active offerings.
- **Core Lab:** included in official academic/timetable commitments; excluded from adaptive theory topic planning.
- **Elective:** assigned by Admin, within the correct group and capacity. Required groups need exactly one eligible choice per Student.

Enter Unit wnines using one line per Unit, such as `Unit 1 | 60` and `Unit 2 | 40`. Each wnine is 0–100 and the total must be 100. Optional starter material is copied into an unapproved review draft.

Editing Units creates a new policy version. Existing approved material retains its old reference until the Subject Owner reviews/activates the replacement draft. Do not interpret the new catalogue wnine as already activated for Students.

### 4. Section offerings and ownership

Open **3. Section offerings**. Select the Subject and matching Section; set capacity and a valid University exam date. Assign at least one PRIMARY Teacher, any additional PRIMARY/CO Teachers, and one shared Subject Owner.

The owner must be PRIMARY on at least one active related offering. Multiple PRIMARY Teachers can exist, but there is one shared Owner. Save DRAFT while preparing; activate only when assignment/owner/capacity requirements are satisfied. Elective choices must have eligible active offerings.

For Sections already containing Students, **Activate planned offerings with enrollment** previews combined activation and capacity-aware elective proposals. Review every allocation (download the complete preview for large groups) and confirm it. This is the supported path when introducing required elective choices to an already allocated Section.

### 5. Official calendar

Open **5. Calendar & timetable** and select Semester.

1. Check working weekdays and enter holiday dates within the term.
2. Enter exam windows, one per line: `IA | YYYY-MM-DD | YYYY-MM-DD`, `PRACTICAL | ...` or `UNIVERSITY | ...`. Configure a University window containing the offering deadlines.
3. Save the calendar before adding recurring timetable rows or timed exams.
4. Select Section; add offering, assigned teaching facilitator, weekday, class/lab kind, local start/end and effective date range.
5. Select an offering under **Exact exam events**. Enter events as `UNIVERSITY | YYYY-MM-DDTHH:MM | YYYY-MM-DDTHH:MM` in the Institute timezone. Each offering's saved exact-event list requires a University event; add IA/practical events where applicable.

The system rejects events outside the term/window, holidays, invalid ranges and overlapping mandatory commitments. Mutually exclusive electives can run in parallel; an actual facilitator cannot teach conflicting slots. Ambiguous/nonexistent DST times fail rather than being silently shifted. Until exact times exist, the old date-only exam deadline conservatively excludes that whole day from study.

Calendar corrections/removals produce configuration snapshots and update affected planning inputs. Timezone edits retain exact exam UTC instants and revalidate local dates.

### 6. Student import or individual placement

For CSV, open **6. CSV import** and download the template. Required columns:

```csv
roll_no,name,email,department,program,batch,semester,section,electives
BE2026-001,Example Student One,student.one@example.invalid,ENG,BE,2026,1,A,OE1
```

`electives` is optional only when no choice is required; separate multiple group choices with semicolons. Codes/path names must match active records. The example in [students.csv](examples/students.csv) needs the example hierarchy and an active elective `OE1` in a required group; it is not automatically imported or an email-delivery fixture.

Preview the file, inspect valid/invalid rows and assigned Subjects, download full row results, then import valid rows. Invalid rows create no partial accounts/placements. An unchanged existing Student identity can be updated idempotently. Files are limited to 2 MB and 2,000 Student rows; institution Student records are capped at 2,000 in this release.

For one Student, create/link the Student account first, then use **4. Student placement** to choose its authoritative Section path, roll number and elective choices. Preview and confirm. Students do not enroll themselves.

Imported accounts start inactive without a password. Generate their setup links under User accounts, after separately arranging website access. Imported Students initially have no availability or fabricated study plan; they configure their own availability after activation.

### 7. Promotion, transfer and closure

Under **4. Student placement**, filter source Section, select Students, choose target Section and target elective choices, and preview. Use the complete preview download for large groups. Confirm the exact preview; capacities and the current revision are rechecked atomically.

Prior enrollments close and assessment/history data remain intact. A live incompatible attempt blocks changes. **Preview closing current placements** ends current placement while retaining history; it is not Student deletion. **Enrollment refresh** reapplies current authoritative allocation rules without duplicate active enrollments.

## Teacher workflow

1. Activate the account and sign in. Only assigned offerings/Students appear.
2. Choose the correct offering/Section in **Curriculum & materials**. Add/edit topic title, estimated hours, Unit, exam wnine, prerequisite links and notes. Import `.txt`/`.md` notes when useful; PDF/OCR upload is not implemented.
3. The Subject Owner reviews and approves the curriculum. Assigned CO/other PRIMARY Teachers can edit drafts but cannot activate shared artifacts.
4. Under **Question bank**, author four-choice single-correct objective questions with difficulty and explanation. Every topic needs at least one Easy, Medium and Hard item before current bank approval. This is the current minimum, not the full future SRS quality/exposure policy.
5. The Owner approves the bank after curriculum review. Later edits form replacement drafts; inspect the pending material before reactivation.
6. In **Classroom coverage**, record `NOT_STARTED`, `IN_PROGRESS`, `COVERED` or `REVISED` for actual teaching progress. Pins influence priority; they do not invent evidence or mark material taught.
7. Use **Learner insights** for assigned learner progress and manual supportive actions. The action appears in that learner's overview; it does not send email or change mastery.

Shared material is propagated to related Section offerings. Coverage, roster, pins, exams and timetable remain offering/Section specific.

**Existing diagnostic subset:** **Diagnostic sessions** can open coverage checkpoints with up to five COVERED/REVISED topics, valid window/duration and enough approved items (five/topic supervised, six/topic unsupervised). Feedback can be released after the closing window. These flows are partially implemented M09/M15 behavior; earlier-semester prerequisite sourcing and full session-version/exposure rules remain planned. Admin's Prerequisite diagnostics screen is not a claim of completed prerequisite diagnostic SRS functionality.

## Student workflow

1. Pass website access, open the private setup link, choose a password and sign in.
2. Confirm **My courses** matches Admin's placement/elective allocation. Report incorrect placement to Admin; no self-add/drop is available.
3. Enter recurring 30-minute blocks and blackout dates in **Study availability** and save.
4. View **My study plan**. The planner uses approved material, eligibility/coverage, learner evidence, deadlines and official calendar commitments. It shows TRIAGE/deficit if work cannot fit; additional free time may help.
5. Open approved notes from a plan slot/course, study and mark the slot complete. Activity completion is distinct from measured mastery.
6. Start practice only for an eligible topic with an approved curriculum/bank. Complete the active attempt before starting another.
7. Take open assigned assessments in **Assigned assessments**. Feedback may be withheld until Teacher release; the Course helper is restricted during active assessment-session conditions.
8. Review **My progress** and finalized evidence. Low evidence/confidence is not proof of low ability; the full learner-model/engagement specification remains partially implemented.
9. Use **Course helper** to retrieve approved note passages with paragraph citations. If no matching material exists, it returns an unsupported-content message. It currently performs deterministic retrieval, not AI-generated tutoring.

## Starter data and clean client data

`lib/sample.ts` seeds labeled starter courses and a sample learner when a campus is first opened. Bootstrap withdraws unowned starter approvals. These records are demonstration content, not client curriculum or real students. Do not relabel the sample learner as a real client Student.

There is no complete production cleanup/purge UI. For a clean client environment, use a separate fresh database/instance and an agreed seed-removal/change procedure in staging; do not delete tables or edit the live JSON cache ad hoc. Full retention/deletion controls remain planned. Manual CSV exports are not database backups.

## Common blocked actions

| Message/situation | Next step |
|---|---|
| Awaiting approval | Ask the Subject Owner to review/activate the curriculum and bank |
| No eligible topics | Teacher records actual coverage; verify prerequisite/eligibility rules |
| Not enough fresh questions | Add approved items; inspect session capacity/exposure requirements |
| Missing required elective | Admin assigns one eligible active offering for each required group |
| Capacity exceeded | Change eligible choices/capacity before previewing again |
| Preview/campus changed | Reload and regenerate the preview; do not reuse an old hash |
| Wrong workspace | Check assigned account role; roles are not selected on login |
| Invitation inaccessible | Check both Cloudflare Access audience and institution setup token expiry/replacement |

For support, report role, exact screen, redacted record IDs, steps and expected/actual behavior. Do not include passwords, setup links or real Student CSV files in public/shared tickets.
