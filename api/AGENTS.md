# API — Backend Agent Guidelines

Backend-specific rules for the `api/` package. Read the root `AGENTS.md` and `docs/SRS.md` first — this file adds backend detail, it does not replace them.

## Layering (strict)

`Router -> Controller -> Service -> Model`.

- **Routers** (`src/routes`): wire paths, attach middleware and Zod `validate({...})`. No logic.
- **Controllers** (`src/controllers`): orchestrate only — read request, call a service, shape the response. No Mongoose queries, no business rules here.
- **Services** (`src/services`): all business rules, cross-entity checks, and side effects live here.
- **Models** (`src/models`): Mongoose schemas + `to*Response` mappers.
- **Validators** (`src/validators`): Zod schemas are the **input contract**. Changing a validator changes accepted business input — treat it as a business change and check the SRS.

## Referential-integrity guards (do not remove or weaken)

These live in `src/services/academic.service.ts` and enforce SRS rules BR-017..BR-021:

- Do **not** deactivate a Major / Subject / Semester / MajorSemester / CurriculumCourse while any user or document/curriculum still references it — return a conflict instead.
- Do **not** change the identity (major/semester/subject) of a CurriculumCourse that already has documents pointing to it.
- Creating a CurriculumCourse requires the major, semester, and subject to be active **and** the major–semester pair to already be linked.
- Academic catalog deletes are **soft-archive** (`isActive: false`), never hard deletes.

## Document lifecycle (do not change without an FR)

- Processing status flow: `pending -> processing -> ready -> failed`, with bounded retries (`MAX_PROCESSING_ATTEMPTS`).
- Deletion is soft (`deletedAt`); trash auto-purges after `TRASH_RETENTION_DAYS` (30). Restoring a document inside a deleted folder requires restoring the parent first.
- Uploads require `curriculumCourseId` and a user may only attach a course within their own academic profile (`assertUserCanUseCurriculumCourse`).
- Storage quota and per-file size are enforced in `document.service.ts` (`assertQuota`); keep the rollback-on-overflow behavior intact.

## Error handling convention

- Throw via `createAppError(ErrorCode.X, httpStatus, { technicalDetail? })` from `src/errors` — never throw raw `Error` for expected business failures.
- Add a new `ErrorCode` entry when introducing a genuinely new business failure case; reuse existing codes otherwise.

## Configuration & limits

Business limits are read from validated env (`src/config/env.ts`): `MAX_UPLOAD_BYTES` (50 MB), `CHAT_DAILY_LIMIT_PER_USER` (50), `TRASH_RETENTION_DAYS` (30), `S3_PRESIGN_EXPIRES_SECONDS` (900), `ALLOWED_EMAIL_DOMAINS`. Changing any default is a business change — update `docs/SRS.md` and `docs/api_reference.md` accordingly.

## When in doubt

If a request implies changing any rule above and you cannot find a matching FR/BR in `docs/SRS.md`, stop and ask the user before editing code.
