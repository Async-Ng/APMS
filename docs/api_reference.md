# API Reference

Base URL production: `https://apms-bscq.onrender.com/api` ([Swagger UI](https://apms-bscq.onrender.com/api/docs/#/)). Local dev: `http://localhost:4000/api`.

Business rules: see `docs/SRS.md` (FR/BR). Technical source of truth is `api/src/routes/index.ts`, validators in `api/src/validators`, models in `api/src/models`, and services in `api/src/services`.

## Route Map

| Route | Mục đích |
| --- | --- |
| `GET /api/health` | Health check |
| `/api/auth` | Auth callback, current user, profile setup |
| `/api/admin` | Admin users (quota, disable, role), stats, access emails, academic catalog |
| `/api/users` | User profile |
| `/api/catalog` | Curricula (CTĐT), semesters, curriculum-semester links, course slots |
| `/api/folders` | Folder operations |
| `/api/documents` | Unified document list and document operations |
| `/api/shares` | Direct read-only sharing |
| `/api/invites` | Invite management |
| `/api/search` | Semantic search |
| `/api/chat` | RAG chat |

Removed routes: `/api/drive`, `/api/library`, and `/api/forum` are not mounted. Use `/api/documents` instead.

## Auth And Access

Most routes require Cognito JWT auth. Login is allowed only for emails in an allowed domain (default `fpt.edu.vn`, `fe.edu.vn`, configurable via `ALLOWED_EMAIL_DOMAINS`) or an approved exception in `access_emails`; other emails are rejected (BR-002). Disabled users are blocked from protected product routes (BR-004), while auth/me-style identity checks can still be used by the client to understand account state.

Document access rules:

| Actor | Can read | Can mutate |
| --- | --- | --- |
| Owner | Own documents, including private/public | Title, tags, folder, course, visibility, delete, restore, star |
| Shared recipient | Shared private document/folder content | Read-only |
| Active user | Public documents | Read-only unless owner |
| Unrelated user | No private access | No |

Changing `visibility` does not remove owner, share, trash, or star state.

## Unified Documents List

`GET /api/documents`

Query:

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `view` | `my | shared | public | starred | trash` | `my` | Selects list mode |
| `parentId` | ObjectId | none | Folder browsing for `my` and shared folder contents |
| `search` | string | none | Case-insensitive title/name search |
| `sort` | `newest | oldest | title` | `newest` | Document sort |
| `page` | number | `1` | Used by public view pagination |
| `limit` | number, max `100` | `20` | Used by public view pagination |
| `curriculumId` | ObjectId | none | Public academic filter |
| `semesterId` | ObjectId | none | Public academic filter |
| `subjectId` | ObjectId | none | Public academic filter |
| `ownerId` | ObjectId | none | Public filter by uploader (owner) |
| `match` | `auto | exact | related | all` | `auto` | Public matching behavior |

Response shape:

```json
{
  "folders": [],
  "documents": [
    {
      "id": "documentId",
      "ownerId": "userId",
      "folderId": null,
      "courseSlotId": "courseId",
      "visibility": "public",
      "title": "Lecture 01.pdf",
      "status": "ready",
      "source": "public",
      "owner": {
        "id": "userId",
        "displayName": "Student Name",
        "email": "student@fpt.edu.vn",
        "avatarUrl": null
      },
      "courseSlot": {
        "id": "courseId",
        "semesterId": "semesterObjectId",
        "semester": { "id": "semesterObjectId", "code": "HK1", "name": "Học kỳ 1" },
        "curriculum": {},
        "subject": {}
      },
      "share": null,
      "matchType": "exact_course"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

`source` is `owned`, `shared`, or `public`. `matchType` is `exact_course`, `same_subject_other_semester`, or `global_public` for public results.

## Document Upload

`POST /api/documents/upload-intents`

Creates a pending document and returns a presigned S3 PUT URL.

```json
{
  "originalFilename": "lecture-01.pdf",
  "mimeType": "application/pdf",
  "fileSizeBytes": 102400,
  "title": "Lecture 01",
  "folderId": null,
  "courseSlotId": "courseObjectId",
  "visibility": "private"
}
```

Rules:

- `courseSlotId` is required for new uploads (FR-013). Uploading a document without a course is rejected (BR-006).
- The course must belong to the curriculum selected in the user's academic profile (BR-007).
- `mimeType` must be PDF, DOCX, or PPTX; other types are rejected (FR-013, BR-008).
- `fileSizeBytes` must be ≤ 50 MB per file (`MAX_UPLOAD_BYTES`) and within the user's 500 MB storage quota (FR-014, BR-009).
- `visibility` is optional, must be `private` or `public`, and defaults to `private` (BR-010).

After S3 upload, call:

`POST /api/documents/:id/complete`

The API verifies the S3 object, updates quota, and moves the document into processing.

## Document Operations

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/documents/:id` | Read metadata; `?download=true` adds a presigned download URL (expires after 15 minutes, `S3_PRESIGN_EXPIRES_SECONDS`) when allowed |
| `PATCH` | `/api/documents/:id` | Owner updates `title`, `tags`, `folderId`, `courseSlotId`, `visibility` |
| `DELETE` | `/api/documents/:id` | Owner soft delete |
| `DELETE` | `/api/documents/:id/permanent` | Owner permanent delete from trash |
| `POST` | `/api/documents/:id/restore` | Owner restore |
| `PATCH` | `/api/documents/:id/star` | Owner star |
| `DELETE` | `/api/documents/:id/star` | Owner unstar |

Patch example:

```json
{
  "title": "Updated Lecture",
  "tags": ["oop", "week-1"],
  "folderId": null,
  "courseSlotId": "courseObjectId",
  "visibility": "public"
}
```

`courseSlotId = null` is not accepted in update payloads.

## Folders

`/api/folders` manages owned folders. Folders support create, read, update, soft delete, permanent delete, restore, star, and unstar. Folder contents are listed through `GET /api/documents?view=my&parentId=<folderId>` or shared folder browsing through `view=shared`.

## Shares

`/api/shares` remains active in this refactor. Shares grant read-only access to a document or folder (BR-013). Shared recipients can read private documents through the share path and can use shared content in search/chat where the backend access rule allows it. A share may target existing users (`sharedWithUserIds`) and/or emails (`emails`), up to 50 recipients total per request; duplicate grants for the same resource + recipient are ignored (BR-014).

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/shares` | Create read-only shares for a document/folder |
| `DELETE` | `/api/shares/:id` | Owner revokes a share (BR-016) |
| `GET` | `/api/shares/with-me` | Resources shared with the current user |
| `GET` | `/api/shares/by-me` | Resources the current user has shared |

## Invites

`/api/invites` handles email-based share invites for recipients without an account yet. Invites expire 7 days after creation (BR-015) and move through `pending -> accepted | revoked`.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/invites/:token` | Public preview of an invite (no auth) |
| `POST` | `/api/invites/:token/accept` | Authenticated accept; grants the read-only share (FR-033) |

## Catalog And Academic Profile

`/api/catalog` exposes active curricula, semesters, curriculum-semester assignments, and course slots.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/catalog/curricula` | Active curricula (CTĐT) |
| `GET` | `/api/catalog/semesters` | Active semesters |
| `GET` | `/api/catalog/curricula/:curriculumId/semesters` | Semesters assigned to a curriculum |
| `GET` | `/api/catalog/curricula/:curriculumId/course-slots?semesterId=` | Course slots for curriculum + optional semester filter |

### `GET /api/catalog/curricula`

Returns active curricula sorted by code.

```json
{
  "status": "success",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "code": "SE",
      "name": "Kỹ thuật phần mềm",
      "description": "",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

### `GET /api/catalog/curricula/{curriculumId}/course-slots`

Returns active course slots for the curriculum. Optional query `semesterId` filters to one semester.

```json
{
  "status": "success",
  "data": [
    {
      "id": "507f1f77bcf86cd799439012",
      "curriculumId": "507f1f77bcf86cd799439011",
      "semesterId": "507f1f77bcf86cd799439014",
      "subjectId": "507f1f77bcf86cd799439013",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z",
      "curriculum": { "id": "...", "code": "SE", "name": "...", "description": "", "isActive": true, "createdAt": "...", "updatedAt": "..." },
      "semester": { "id": "...", "code": "HK1", "name": "Học kỳ 1", "sortOrder": 1, "isActive": true },
      "subject": { "id": "...", "code": "PRF192", "name": "...", "description": "", "isActive": true, "createdAt": "...", "updatedAt": "..." }
    }
  ]
}
```

Returns `404` when `curriculumId` is missing or inactive.

### `GET /api/users/me/academic-profile`

Returns the signed-in user's academic profile.

```json
{
  "status": "success",
  "data": {
    "curriculum": { "id": "...", "code": "SE", "name": "...", "description": "", "isActive": true, "createdAt": "...", "updatedAt": "..." },
    "currentSemester": { "id": "...", "code": "HK1", "name": "Học kỳ 1", "sortOrder": 1, "isActive": true },
    "currentSubjects": [
      { "id": "...", "code": "PRF192", "name": "...", "description": "", "isActive": true, "createdAt": "...", "updatedAt": "..." }
    ],
    "isComplete": true
  }
}
```

`isComplete` is `true` when a valid curriculum is set. `currentSemester` and `currentSubjects` are retained for compatibility with older data and may be `null`/empty.

### `PATCH /api/users/me/academic-profile`

Updates the signed-in user's academic profile. Only `curriculumId` is required; course slots are selected later when uploading or editing documents.

```json
{
  "curriculumId": "507f1f77bcf86cd799439011"
}
```

`currentSemesterId` and `currentSubjectIds` are accepted only for backward compatibility and are no longer required. Updating the profile clears the saved semester/subject selection. Returns the same shape as `GET`.

Admin academic CRUD under `/api/admin`:

- `GET/POST/PATCH/DELETE /api/admin/curricula`
- `GET/POST/PATCH/DELETE /api/admin/semesters`
- `GET/POST/DELETE /api/admin/curricula/:curriculumId/semesters` (when listing, inactive curricula are allowed so admins can inspect archived CTĐT)
- `GET/POST/PATCH/DELETE /api/admin/subjects`
- `GET/POST/PATCH/DELETE /api/admin/course-slots` (body uses `curriculumId`, `semesterId`, `subjectId`)
- `POST /api/admin/course-slots/bulk` — body `{ curriculumId, semesterId, subjectIds: string[] (1-50) }`; creates one Course slot per subject for the given curriculum + semester, skipping (without failing the request) subjects that are inactive or already have a slot. Returns `{ created: CourseSlot[], skipped: { subjectId, reason }[] }`.

`PATCH /api/admin/users/:id` accepts optional `role: user | admin` (syncs Cognito group `admin` + MongoDB `users.role`). Guards: cannot demote self, cannot demote last active admin, cannot promote disabled users.

Documents reference `courseSlotId`, which links a subject to a curriculum and semester entity. Public document discovery uses this mapping for `match=auto`, exact-course matches, related same-subject matches, and global public results.

## Search And Chat

Search (`GET /api/search`) and chat use the same access model as document detail (BR-022):

- Private scope includes owned and directly shared documents.
- Public scope can retrieve public documents system-wide.
- Chat context checks document readability before using any document as grounding context.

Embeddings are created with Vertex AI `gemini-embedding-001` at 1024 dimensions and stored in MongoDB Atlas Vector Search.

### Chat sessions and messages

`/api/chat` manages RAG chat sessions and messages.

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/chat/sessions` | Create a session with a context (FR-040) |
| `GET` | `/api/chat/sessions` | List the user's sessions (excludes sessions whose document/folder context is deleted or missing — FR-044, BR-026) |
| `GET` | `/api/chat/sessions/:id` | Session detail with messages (404 if context unavailable) |
| `PATCH` | `/api/chat/sessions/:id` | Rename or pin/unpin (`title`, `isPinned`) |
| `DELETE` | `/api/chat/sessions/:id` | Delete a session |
| `POST` | `/api/chat/sessions/:id/messages` | Ask a question; returns answer + citations + suggestedQuestions |
| `POST` | `/api/chat/sessions/:id/messages/stream` | Same, streamed incrementally; final `done` event includes suggestedQuestions (FR-045) |

- `contextType`: `all | folder | document | documents` selects the grounding scope (FR-040). `contextId` is required for `folder`/`document`; `contextIds` (1–20) for `documents`.
- `mode`: `chat | summary | faq | study_guide` (FR-043). In `chat` mode `content` is required (BR-024); max 10,000 chars.
- Answers prioritize concise, conversational first-pass responses across all modes; users can ask follow-up questions for deeper detail (FR-041).
- Answers include `citations` referencing document, page, and section (FR-042, BR-023).
- Assistant messages include `suggestedQuestions: string[]`; chat mode may return up to 3 follow-up questions, while `summary`, `faq`, and `study_guide` return an empty array.
- Each user is limited to 50 chat questions per day (counted across all sessions since 00:00 UTC, role `user`); exceeding it returns `429 CHAT_DAILY_LIMIT` (FR-062, BR-025). Setting `CHAT_DAILY_LIMIT_PER_USER=0` disables the limit.

## Migration Notes

Run after deploying the document visibility refactor:

```bash
cd api
pnpm migrate:document-visibility
```

Run after deploying semester entities (replaces legacy `semesterNumber` / `currentSemester` fields):

```bash
cd api
pnpm migrate:semester-entities
```

The semester migration upserts `HK1..HK9` semester records, maps existing course slots and user profiles to `semesterId`, and creates `curriculum_semesters` links. It is idempotent.

Run after deploying the major-to-curriculum rename:

```bash
cd api
pnpm migrate:major-to-curriculum
```

The visibility migration maps legacy `personal` values to `private` and legacy `internal` values to `public`. It does not modify S3 objects, chunks, shares, folders, or assign missing courses to old records.
