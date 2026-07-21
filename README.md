# APMS - Academic Personal Management System

APMS is a student knowledge-management system for academic documents. It lets users upload course-bound files, organize owned folders, share private resources, discover public course documents, search semantically, and ask grounded AI questions with citations.

## Current Stack

| Area | Technology |
| --- | --- |
| API | Node.js 20+, Express 5, TypeScript, Zod, Mongoose 9 |
| Web | Next.js 16 App Router, React 19, Tailwind CSS 4, TanStack Query, Zustand |
| Mobile | Expo 54, React Native 0.81, Expo Router, NativeWind, TanStack Query |
| Data | MongoDB Atlas, Atlas Vector Search |
| Files | Amazon S3 presigned upload/download |
| Auth | Amazon Cognito, Google sign-in through Amplify clients |
| Email | Amazon SES |
| AI | Vertex AI Gemini, `gemini-embedding-001` embeddings, Gemini chat/vision models |
| Infra | AWS CDK for Cognito, S3, SES-related infrastructure |

## Core Capabilities

- Unified document API: `GET /api/documents` is the single list entrypoint for `my`, `shared`, `public`, `starred`, and `trash` views.
- Course-bound uploads: every new document upload requires `courseSlotId`. Allowed types are PDF, DOCX, and PPTX, up to 50 MB per file within a 500 MB per-user quota.
- Visibility model: `private` documents are owner/share-only; `public` documents are discoverable by active users across the system.
- Folder workspace: owned documents and folders keep a Drive-like hierarchy through `/api/folders` and `view=my`.
- Sharing: `/api/shares` remains available for direct read-only sharing of documents and folders.
- Academic discovery: public document listing supports curriculum, semester, subject, and match filters.
- Search and chat: semantic search and RAG chat use Gemini embeddings plus MongoDB Atlas Vector Search; chat answers are streamed with clickable source citations, document-viewer deep links, and follow-up suggestions, and are limited to 50 turns per user per day (regenerating or editing a question also counts). Users can stop a streaming answer (keeping the partial result), regenerate the latest answer, edit and resend a question, and copy messages; untitled sessions are auto-titled from the first exchange, and the web app renders LaTeX math (KaTeX) and syntax-highlighted code.
- Admin access control: active/disabled users, email-domain allowlist, exact-email exceptions, and promote/demote admin role (Cognito group + MongoDB).

Removed API surfaces: `/api/drive`, `/api/library`, and `/api/forum` are no longer mounted. They are replaced by the unified `/api/documents` API.

## Architecture

```text
Web / Mobile
  -> API Gateway shape: Express REST API under /api
  -> Auth: Cognito JWT + local user profile
  -> Documents: MongoDB metadata + S3 file objects
  -> Processing worker: Gemini vision page-to-Markdown extraction (tables, LaTeX math, code, figure descriptions) -> structural chunking -> Gemini embeddings
  -> Retrieval: Atlas Vector Search over document_chunks
  -> Generation: Gemini chat with grounded context, citations, and follow-up suggestions
```

## Main API Routes

| Route | Purpose |
| --- | --- |
| `GET /api/health` | Health check |
| `/api/auth` | Login callback, current user, profile setup |
| `/api/admin` | Admin users (quota, disable, role), stats, email allowlist, academic catalog |
| `/api/users` | Current user profile and academic metadata |
| `/api/catalog` | Curricula, semesters, curriculum-semester links, course slots |
| `/api/folders` | Folder CRUD, star, restore, permanent delete |
| `/api/documents` | Unified document list and document operations |
| `/api/shares` | Direct document/folder sharing |
| `/api/invites` | Invite flow |
| `/api/search` | Semantic search |
| `/api/chat` | RAG chat sessions and messages |

See [docs/api_reference.md](./docs/api_reference.md) for the current contract.

## Environment

Create package-local env files from the corresponding examples when available. Important API variables:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_REGION` | Cognito auth |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated login domain allowlist (default `fpt.edu.vn,fe.edu.vn`) |
| `MAX_UPLOAD_BYTES` | Max file upload size, default 50 MB (`52428800`) |
| `CHAT_DAILY_LIMIT_PER_USER` | Daily chat questions per user, default `50` (`0` disables) |
| `TRASH_RETENTION_DAYS` | Days before trashed items are purged, default `30` |
| `TRASH_PURGE_INTERVAL_MS` | How often the auto-purge worker runs, default `86400000` (24h) |
| `S3_PRESIGN_EXPIRES_SECONDS` | Presigned URL lifetime, default `900` (15 min) |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS SDK access for S3/SES |
| `S3_BUCKET_NAME` | Document object bucket |
| `SES_FROM_EMAIL` | Verified sender email |
| `APP_URL` | Public app URL for links/invites |
| `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` | Vertex AI project and region |
| `GEMINI_CHAT_MODEL`, `GEMINI_EMBEDDING_MODEL` | Gemini chat and embedding models |
| `GEMINI_EMBEDDING_OUTPUT_DIMENSION` | Embedding dimension, default `1024` |
| `DOC_VISION_ENABLED` | Enables Gemini vision page-to-Markdown extraction |
| `DOC_VISION_PAGE_STRATEGY` | `all` (parse every PDF page, default) or `auto` (only scanned/structured pages, saves quota) |
| `DOC_VISION_MAX_PAGES` | Max vision-parsed pages per document, default `60` |

Vertex AI uses Google Application Default Credentials. Configure ADC or `GOOGLE_APPLICATION_CREDENTIALS` in the API runtime environment.

## Local Development

Use Node.js 20+ and pnpm. Install dependencies inside each package you modify.

```bash
cd api && pnpm install && pnpm dev
cd web && pnpm install && pnpm dev
cd mobile && pnpm install && pnpm start
cd infrastructure && pnpm install && pnpm build
```

Useful API maintenance commands:

```bash
cd api
pnpm migrate:document-visibility
pnpm migrate:semester-entities
pnpm migrate:major-to-curriculum
pnpm setup:atlas
pnpm purge:trash
pnpm build
```

## Documentation

- [Software Requirements Specification (business spec)](./docs/SRS.md)
- [Project overview](./PROJECT.md)
- [API reference](./docs/api_reference.md)
- [System overview](./docs/system_overview.md)
- [Database design](./docs/database_design.md)
- [Post-deploy setup](./docs/post_deploy_setup.md)
- [Coding standards](./docs/coding_standards.md)
- [UI design system](./docs/ui_design_system.md)
