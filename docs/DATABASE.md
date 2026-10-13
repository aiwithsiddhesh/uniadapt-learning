# Database setup and administration

## Current storage model

The application uses Cloudflare **D1** through the server-side `env.DB` binding. D1 provides a SQLite-compatible data model in the Worker environment. `db/schema.ts` defines the schema; routes/domain stores use prepared SQL and D1 batches. A local SQLite/D1 simulation is used for development; Node's in-memory SQLite fixtures are used by automated tests.

There is no database URL, Postgres driver, Supabase client or generic ORM adapter switch in this release. External D1 is the closest supported storage technology, and the standalone host code is prepared; actual client deployment remains pending.

## Application tables

| Domain | Tables |
|---|---|
| Campus identity and learning cache | `campuses`, `institutions` |
| Accounts and security | `accounts`, `auth_tokens`, `auth_limits`, `security_audit` |
| Academic hierarchy | `academic_institutes`, `academic_departments`, `academic_programs`, `academic_batches`, `academic_semesters`, `academic_sections` |
| Catalogue and assignments | `academic_subjects`, `academic_units`, `academic_unit_policies`, `academic_offerings`, `academic_assignments` |
| Placement, enrollment and history | `academic_placements`, `academic_enrollments`, `academic_placement_history`, `academic_operations` |
| Calendar | `academic_calendars`, `academic_calendar_versions`, `academic_timetables`, `academic_exams` |

These are **25 application tables**. Wrangler/provider migration metadata may add other tables. `institutions` has the default institutional root; academic records and accounts are scoped to its campus ID. Do not manually change IDs to merge campuses or move accounts.

Important storage boundaries:

- Accounts store bcrypt hashes, not passwords. Setup/reset tokens are stored as hashes.
- Academic records and immutable Unit/calendar snapshots are normalized.
- Topics, questions, attempts, evidence, plans and other learning state remain in the `campuses.state` JSON cache. The save limit is **1,500,000 UTF-8 bytes**.
- The current runtime supports one default institution. A multi-institution SaaS tenancy model is not implemented.
- Closing placement/enrollment retains historical records. Deactivation is not deletion or personal-data erasure.

## Local D1

From the repository root:

```bash
pnpm db:migrate:local
pnpm db:check:local
```

The local config and Vite bind to the same placeholder database. Data lives under `.wrangler/state`, which must stay out of Git. For a local SQL inspection:

```bash
pnpm exec wrangler d1 execute DB --local --config wrangler.local.json --persist-to .wrangler/state --command "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
pnpm exec wrangler d1 execute DB --local --config wrangler.local.json --persist-to .wrangler/state --command "PRAGMA foreign_key_check"
```

A clean foreign-key check returns no violations. Do not expose local SQL/admin interfaces to Students or the public network.

## Creating a client-owned Cloudflare D1 database

**Operator:** the client's authorized infrastructure administrator. **Outcome:** a real client-owned D1 database and migrated schema, not a completed standalone UniAdapt deployment. The existing Site's provider-managed `DB` is not replaced by this procedure.

1. Create/select the client's Cloudflare account through its normal dashboard. Agree account ownership, billing, region/data handling and staging/production separation. Use the official [D1 getting-started guide](https://developers.cloudflare.com/d1/get-started/).
2. On the client's authorized workstation, sign in through Wrangler:

   ```bash
   pnpm exec wrangler login
   pnpm exec wrangler whoami
   ```

3. Create a **staging** database first:

   ```bash
   pnpm exec wrangler d1 create uniadapt-client-staging
   ```

   Copy the returned database ID exactly. Do not invent an ID or use the delivered local placeholder. The dashboard alternative is **Workers & Pages → D1 SQL Database → Create Database**.

4. Copy `docs/templates/wrangler.d1.example.json` to `wrangler.client.json` at the repository root. Set `database_name` to the created name, `database_id` to the returned ID and keep `migrations_dir` as `drizzle` for the root-level copy. Keep `binding` exactly `DB`. The resulting database-only configuration is:

   ```json
   {
     "name": "uniadapt-client-database",
     "compatibility_date": "2026-05-15",
     "d1_databases": [{
       "binding": "DB",
       "database_name": "uniadapt-client-staging",
       "database_id": "YOUR_RETURNED_DATABASE_ID",
       "migrations_dir": "drizzle"
     }]
   }
   ```

   `wrangler.client.json` is ignored to avoid confusing a client configuration with the existing Site. It has no Worker entrypoint/assets or identity provider and is **not** a deploy file.

5. Inspect pending migrations, then apply them to the selected new database:

   ```bash
   pnpm exec wrangler d1 migrations list DB --remote --config wrangler.client.json
   pnpm exec wrangler d1 migrations apply DB --remote --config wrangler.client.json
   pnpm exec wrangler d1 execute DB --remote --config wrangler.client.json --command "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
   pnpm exec wrangler d1 execute DB --remote --config wrangler.client.json --command "PRAGMA foreign_key_check"
   ```

6. Record database name, ID, account ownership, schema version and access administrator in the private client asset inventory. Keep credentials out of the repository.
7. Complete [private standalone deployment](CLOUDFLARE_DEPLOY.md), bind the deployed Worker to this D1 as `DB`, configure its session secret and run client acceptance in staging. Repeat the provisioning procedure with a separate production database only after acceptance.

The cloud commands intentionally use `--remote`. They create/query/change client cloud resources and must be run by an authorized operator. They were not executed against a client account during this handover.

## Migration policy

| Delivered migration | Purpose |
|---|---|
| `0000_closed_vin_gonzales.sql` | Original campus learning-state persistence |
| `0001_shallow_hawkeye.sql` | Institution accounts, token/throttle/audit data |
| `0002_green_rictor.sql` | Academic hierarchy, subjects, assignments, enrollment and placement history |
| `0003_lonely_hobgoblin.sql` through `0006_outgoing_miracleman.sql` | Additive M01–M04 foundation changes, including profile/username, Unit/calendar/timetable/exam and retained-placement fields |

Read the SQL for exact column-level changes; migration names are generated identifiers. Never edit an already applied migration. Generate a new one with `pnpm db:generate`, review the schema/SQL together, test an existing-data upgrade and apply to staging before production.

Wrangler records its migration history separately from provider-managed Sites migrations. **Do not run the complete fresh-database migration chain on the existing hosted Site** unless its owner/operator has reconciled the applied ledger. Existing-data preservation is covered by `tests/migration.test.mts`; that does not prove every real database's upgrade history is identical. Reference: [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).

## Backup, restore and migration to another environment

Use full SQL exports for backups, not the UI CSV exports. Example for an operator-controlled D1:

```bash
pnpm exec wrangler d1 export DB --remote --config wrangler.client.json --output uniadapt-staging.backup.sql
```

Store the export encrypted with restricted access; it contains private learning/account records and password/token hashes. Do not commit it. Restore into a **new isolated recovery database** using a separate reviewed configuration, not directly over production:

```bash
pnpm exec wrangler d1 execute DB --remote --config wrangler.recovery.json --file uniadapt-staging.backup.sql
```

Check tables, migration ledger, foreign keys, representative row counts and the full runtime/role flows after reconnecting an isolated staging Worker. Keep recovery maintenance offline until provider IDs, binding, secrets and access are verified. A restore may reintroduce token/session state; review revocation before making it accessible.

Cloudflare also offers D1 Time Travel within its applicable retention window. The operator must review the current provider policy and the exact restore point; restoring rolls back subsequent writes. Do not assume an application deployment rollback restores the database. See [import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/) and [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/).

For the existing Sites-managed database, obtain backup/export operations through its authorized hosting owner/support path; a client Cloudflare login does not grant access to that provider-managed database. Scheduled backups, tested recovery time/objective and production restore evidence remain handover acceptance work.

## PostgreSQL, Supabase or another database

These require implementation work: replace D1 bindings and SQL adapters, port SQLite/JSON SQL and transaction guards, create provider-specific migrations, migrate normalized and cached learning data, and rerun all rollback/scope/concurrency tests. Supabase Auth is also a separate authentication integration; adding its URL/key does not enable it. Do not describe either migration as supported by an environment-variable change.
