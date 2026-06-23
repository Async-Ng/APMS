# CLAUDE.md

Guidance for AI coding assistants working in this repository.

Always read `PROJECT.md` first. It is the concise source of truth for the current APMS product shape.

## Current Architecture

- API: Express 5, TypeScript, Zod, Mongoose.
- Web: Next.js 16 App Router, React 19, Tailwind CSS 4.
- Mobile: Expo 54, React Native 0.81, Expo Router, NativeWind.
- AI: Vertex AI Gemini with `gemini-embedding-001`.
- Storage/auth: Amazon S3, Cognito, SES.

## Backend Rules

- Follow `Router -> Controller -> Service -> Model`.
- Validate external input with Zod.
- Keep authorization middleware ordering intact.
- Unified document listing is `GET /api/documents`.
- Do not add compatibility wrappers for removed `/api/drive`, `/api/library`, or `/api/forum`.
- Document visibility is `private | public`.
- Uploads require `curriculumCourseId`; default visibility is `private`.

## Documentation Rules

When endpoints, schemas, AI provider, or index dimensions change, update:

- `docs/api_reference.md`
- `docs/database_design.md`
- `docs/system_overview.md`
- `README.md`

Keep language style consistent with the file being edited.
