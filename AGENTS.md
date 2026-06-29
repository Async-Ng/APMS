# Repository Guidelines

These guidelines apply to **every AI agent** working in this repository (Claude Code, Cursor, Copilot, etc.). `CLAUDE.md` files only `@import` this file — author shared rules here, not in `CLAUDE.md`.

## Business source of truth & ways of working

Read these **before** changing any business behavior, in this order of authority:

1. `PROJECT.md` — concise product shape (what APMS is, current scope).
2. `docs/SRS.md` — **authoritative business rules**: functional requirements (FR), business rules (BR), non-functional requirements (NFR). Every business behavior is specified here with an ID.
3. `docs/api_reference.md` + `docs/database_design.md` — technical contracts (endpoints, schemas) that implement the SRS.

### Anti-drift rules (do not deviate from business direction)

- **Map every business change to an FR/BR in `docs/SRS.md`.** If no FR/BR covers the change, **STOP and ask the user** — do not invent new behavior or guess intent.
- **Do not remove, rename, or loosen** a business rule, status, enum value, or limit without an explicit instruction. These encode agreed-upon behavior.
- **Do not "drive-by" refactor** in a way that changes behavior. Keep changes minimal and scoped to what was asked.
- When the user asks for something that contradicts the SRS, surface the conflict (cite the FR/BR) and confirm before proceeding.

### Core invariants (must not break)

- Document `visibility` is exactly `private | public`; default on upload is `private`.
- Uploads **require** `curriculumCourseId`.
- Backend flow is strictly `Router -> Controller -> Service -> Model`.
- Validate all external input with Zod; validators are the input contract.
- Academic catalog (majors, subjects, semesters, major-semesters, curriculum-courses) uses **soft-archive (`isActive`)**, never hard delete.
- Referential-integrity guards block deactivating/changing catalog entries that are still referenced — see `api/AGENTS.md`.
- Keep authorization middleware ordering intact (`authenticate -> resolveUser -> requireActiveUser -> [requireAdmin]`).
- Unified document listing is `GET /api/documents`. Do **not** add compatibility wrappers for the removed `/api/drive`, `/api/library`, or `/api/forum` routes.

### Hard limits (changing a number = changing business → update SRS too)

- 50 MB per uploaded file; 500 MB default storage quota per user.
- Trash auto-purges after 30 days.
- 50 AI chat messages per user per day.
- Share invites expire after 7 days; file download links expire after 15 minutes.
- Login allowlist: email domains `fpt.edu.vn`, `fe.edu.vn` (configurable) plus approved exception emails.

### Checklist before editing business logic

1. Read the relevant `docs/SRS.md` section and confirm the FR/BR it maps to.
2. Implement the minimal change in the correct layer.
3. Keep docs in sync (see Documentation Rules).
4. State how to verify the change.

## Current Architecture

- API: Express 5, TypeScript, Zod, Mongoose.
- Web: Next.js 16 App Router, React 19, Tailwind CSS 4.
- Mobile: Expo 54, React Native 0.81, Expo Router, NativeWind.
- AI: Vertex AI Gemini with `gemini-embedding-001` (1024 dims).
- Storage/auth/email: Amazon S3, Cognito, SES.

## Project Structure & Module Organization

- `api/`: Express REST API. Keep request handling in `src/controllers`, business logic in `src/services`, persistence in `src/models`, validation in `src/validators`, and route registration in `src/routes`. See `api/AGENTS.md` for backend-specific rules.
- `web/`: Next.js App Router application. Routes live in `app/`, reusable UI in `components/`, API/query helpers in `lib/`, and global client state in `stores/`.
- `mobile/`: Expo Router application, organized into `app/`, `components/`, `hooks/`, `lib/`, and `stores/`.
- `infrastructure/`: AWS CDK stacks in `lib/`, entry points in `bin/`, and Jest tests in `test/`.

Documentation lives in `docs/`. Each package has its own lockfile; run commands from that directory.

## Build, Test, and Development Commands

Use Node.js 20+ and pnpm. Run `pnpm install` in each package you modify.

- `cd api && pnpm dev`: run the API on port 4000; `pnpm build` compiles to `dist/`.
- `cd web && pnpm dev`: run Next.js on port 3000; `pnpm lint` checks code and `pnpm build` creates a production build.
- `cd mobile && pnpm start`: launch Expo; use `pnpm android`, `pnpm ios`, or `pnpm lint`.
- `cd infrastructure && pnpm test`: run Jest; `pnpm build` type-checks CDK code. Review `pnpm cdk diff` before deployment.

## Coding Style & Naming Conventions

Use strict TypeScript, two-space indentation, and avoid `any` or unsafe assertions. Prefer `interface` for object shapes and `type` for unions. Name components in PascalCase (`UploadModal.tsx`), hooks with `use` (`useDocuments.ts`), and backend modules by role (`document.service.ts`). Follow `Router -> Controller -> Service -> Model`; validate external input with Zod. Use TanStack Query for server state and Zustand only for shared client state.

## Documentation Rules

When endpoints, schemas, business limits, AI provider, or index dimensions change, update **all** of the following so they stay consistent:

- `docs/SRS.md` (FR/BR/NFR — the business spec)
- `docs/api_reference.md`
- `docs/database_design.md`
- `docs/system_overview.md`
- `README.md`

Keep language style consistent with the file being edited.

## Testing Guidelines

Infrastructure tests use Jest and follow `*.test.ts`, as in `test/infrastructure.test.ts`. Add tests there for CDK changes. API, web, and mobile lack automated test scripts; run build/lint checks and document manual verification in the PR.

## Commit & Pull Request Guidelines

Recent history follows Conventional Commits with scopes, for example `feat(api): add document reprocessing` and `fix(chat): improve citation handling`. Keep commits focused and imperative. PRs should summarize behavior, identify affected packages, link the issue, list verification commands, and include screenshots or recordings for UI changes. Call out environment, schema, API, or infrastructure changes explicitly; update the documentation set above when endpoints or business rules change.

## Security & Configuration

Copy each package's `.env.example` to its documented local environment file. Never commit credentials or `.env` files. Keep authorization middleware ordering intact, and review CDK diffs before applying cloud changes.
