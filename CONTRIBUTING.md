# Development and change process

1. Start from the private repository's current `main` and create a feature/fix branch.
2. Read the affected specification/module status and [architecture](docs/ARCHITECTURE.md). Preserve role/scope/Owner authority and historical evidence.
3. Use synthetic local data and the [setup guide](docs/SETUP.md); never work against production learning records for routine tests.
4. Change the smallest relevant implementation. Add meaningful tests for behavior/risk; do not claim a module complete from UI presence alone.
5. For schema changes, create a new reviewed migration; preserve applied files and test existing-data upgrades. Update domain types and documentation with the implementation.
6. Run `pnpm test`, `pnpm typecheck` and `pnpm build`; run relevant browser/provider acceptance for the change. Record any checks not performed.
7. Submit a PR explaining the problem, resulting behavior, requirement/module scope, verification and remaining limits. Do not attach secrets or private Student records.
8. Use the authorized [release runbook](docs/OPERATIONS.md) after review. GitHub merges do not automatically deploy the current Site.

CI automation is not configured by this handover. The technical owner can adopt the documented validation commands as its CI gates. Root project licensing/client ownership and support agreements are separate from contributor instructions.

Report suspected access/credential issues privately to the agreed repository/operations owner. Include redacted reproduction and affected environment; do not post token values, invitation URLs or database exports.
