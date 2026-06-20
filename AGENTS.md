# Repository Guidelines

## Project Structure & Module Organization

- `api/`: Express REST API. Keep request handling in `src/controllers`, business logic in `src/services`, persistence in `src/models`, validation in `src/validators`, and route registration in `src/routes`.
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

## Testing Guidelines

Infrastructure tests use Jest and follow `*.test.ts`, as in `test/infrastructure.test.ts`. Add tests there for CDK changes. API, web, and mobile lack automated test scripts; run build/lint checks and document manual verification in the PR.

## Commit & Pull Request Guidelines

Recent history follows Conventional Commits with scopes, for example `feat(api): add document reprocessing` and `fix(chat): improve citation handling`. Keep commits focused and imperative. PRs should summarize behavior, identify affected packages, link the issue, list verification commands, and include screenshots or recordings for UI changes. Call out environment, schema, API, or infrastructure changes explicitly; update `docs/api_reference.md` when endpoints change.

## Security & Configuration

Copy each package's `.env.example` to its documented local environment file. Never commit credentials or `.env` files. Keep authorization middleware ordering intact, and review CDK diffs before applying cloud changes.
