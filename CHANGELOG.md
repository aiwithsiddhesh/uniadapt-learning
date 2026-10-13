# Changelog

## 2026-10-13 — Client handover documentation

- Replace the implementation-only README with product overview, delivery status, setup entry point, roadmap and responsibility boundaries.
- Add setup, external D1/database administration, authentication, usage, testing, architecture/API, deployment/backup/maintenance and client acceptance guides.
- Add local secret/config checks, explicit local migration/query commands and non-secret configuration/CSV examples.
- Ignore development secret files, generated TypeScript metadata and database backup files.
- Preserve existing product behavior and owner-private live deployment. GitHub documentation updates do not trigger deployment.

## 2026-10-13 — Foundation implementation and private source delivery

- M01–M04 functionality implemented: accounts/scoped access, hierarchy, catalogue/Teacher/Student allocation, CSV/bulk placement, Unit policy versions, calendar/exams/timetable and planner constraints.
- Recorded validation: 99 tests, TypeScript, production build and live readiness/auth boundary checks passed.
- Sites release version 4 uses business source `c6e526fc91d288f0757c7807cff0b580ef0cbeb5`.
- Initial GitHub source import is `4a1214fa3b406ca01bc14a255ce5bb8feb0568fa`.
- Full AI product, client acceptance and broader production readiness remain outstanding; see the roadmap and handover record.
