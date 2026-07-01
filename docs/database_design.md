# Database Design

Business rules: see `docs/SRS.md` (FR/BR). APMS dùng MongoDB Atlas cho metadata, học vụ, sharing, chat history và vector search. File gốc nằm trên Amazon S3; MongoDB chỉ lưu metadata và chunks.

## Collections

| Collection | Mục đích |
| --- | --- |
| `users` | User local profile, role, disabled state, quota, academic profile |
| `access_emails` | Exact-email allowlist ngoài domain mặc định |
| `curriculums` | Curriculum (track học vụ) |
| `semesters` | Học kỳ (entity: code, name, sortOrder) |
| `curriculumsemesters` | Junction curriculum ↔ học kỳ |
| `subjects` | Môn học |
| `courseslots` | Mapping curriculum + semesterId + môn |
| `folders` | Cây thư mục cá nhân |
| `documents` | Metadata tài liệu |
| `document_chunks` | Text chunks + embeddings |
| `shares` | Quyền read-only trực tiếp |
| `shareinvites` | Email share invite records (hết hạn sau 7 ngày, BR-015) |
| `chat_sessions` | Chat sessions |
| `chat_messages` | Chat messages, citations, và suggested questions |

Storage quota mặc định 500 MB/người (`users.storageQuotaBytes`); tài liệu trong thùng rác bị purge sau 30 ngày (`TRASH_RETENTION_DAYS`, BR-027).

## Documents

Important fields:

| Field | Type | Notes |
| --- | --- | --- |
| `ownerId` | ObjectId | Required, ref `users` |
| `folderId` | ObjectId \| null | Folder chứa tài liệu |
| `courseSlotId` | ObjectId \| null | Required for new uploads; legacy rows may still be null until assigned |
| `visibility` | `private | public` | Default `private` |
| `title` | string | Display title |
| `originalFilename` | string | Original upload name |
| `mimeType` | string | File MIME type |
| `s3Key` | string | Unique S3 object key |
| `fileSizeBytes` | number | Used for quota |
| `status` | `pending | processing | ready | failed` | Processing lifecycle (FR-015) |
| `processingAttempts` | number | Retry counter, capped at `MAX_PROCESSING_ATTEMPTS` |
| `lastError`, `nextRetryAt` | string \| Date \| null | Last failure detail and next retry time |
| `extractionMode`, `extractionConfidence` | string | How text was extracted |
| `pageCount` | number | Optional after extraction |
| `chunkCount` | number | Number of chunks |
| `tags` | string[] | User tags |
| `isStarred` | boolean | Owner-only star |
| `deletedAt` | Date \| null | Soft delete marker; trash purged after 30 days (BR-027) |

Indexes in source:

```js
{ ownerId: 1, folderId: 1 }
{ ownerId: 1, deletedAt: 1 }
{ ownerId: 1, isStarred: 1 }
{ status: 1 }
{ visibility: 1, courseSlotId: 1, deletedAt: 1 }
```

## Visibility Semantics

- `private`: owner can read/mutate; shared recipients can read through `/api/shares` access.
- `public`: active users can discover/read system-wide; only owner can mutate.
- Public listing filters out deleted documents and pending uploads.
- Public documents must have `courseSlotId` for normal discovery.

Legacy enum values are handled by `pnpm migrate:document-visibility`: old `personal` becomes `private`; old `internal` becomes `public`.

## Academic Catalog

### `semesters`

| Field | Notes |
| --- | --- |
| `code` | Unique uppercase, e.g. `HK1` |
| `name` | Display name |
| `sortOrder` | Global sort in dropdowns |
| `isActive` | Soft archive |

### `curriculumsemesters`

Junction **Curriculum ↔ Semester**. Admin assigns semesters to a curriculum before course-slot mapping.

| Field | Notes |
| --- | --- |
| `curriculumId`, `semesterId` | Unique pair (BR-018) |
| `sortOrder` | Optional per-curriculum order override |
| `isActive` | Soft-archive: remove semester from curriculum without deleting global semester (BR-020) |

### `courseslots`

| Field | Notes |
| --- | --- |
| `curriculumId` | Ref `curriculums` |
| `semesterId` | Ref `semesters` (replaces legacy `semesterNumber`) |
| `subjectId` | Ref `subjects` |

Unique index: `{ curriculumId, semesterId, subjectId }` (BR-019). `(curriculumId, semesterId)` must exist in active `curriculumsemesters` (BR-018). Catalog entries use soft-archive (`isActive`) and cannot be deactivated/changed while still referenced by users or documents (BR-020, BR-021).

### `users` academic profile

| Field | Notes |
| --- | --- |
| `curriculumId` | Ref `curriculums`; required for a complete academic profile |
| `currentSemesterId` | Legacy optional ref `semesters`; not required for profile completion |
| `currentSubjectIds` | Legacy optional refs `subjects`; not required for profile completion |
| `storageUsedBytes` | Bytes currently used by the user's documents |
| `storageQuotaBytes` | Storage quota, default 500 MB (`524_288_000`) |

Legacy `currentSemester` (number) is migrated by `pnpm migrate:semester-entities`.

## Unified List Queries

`GET /api/documents` is implemented by `document-list.service.ts`.

| View | Query basis |
| --- | --- |
| `my` | `folders/documents` by `ownerId`, `parentId`, `deletedAt: null` |
| `shared` | Direct shares plus shared folder traversal |
| `public` | `documents` with `visibility: public`, valid course, not deleted, not pending |
| `starred` | Owner folders/documents with `isStarred: true` |
| `trash` | Owner folders/documents with `deletedAt != null` |

Public match types:

| Match type | Meaning |
| --- | --- |
| `exact_course` | Same curriculum, current semesterId, current subject |
| `same_subject_other_semester` | Same subject in another semester of the same curriculum |
| `global_public` | Public but not profile-related |

## Document Chunks And Vector Search

`document_chunks` stores extracted chunks and Gemini embeddings.

| Field | Notes |
| --- | --- |
| `documentId` | Ref `documents` |
| `ownerId` | Used for access filtering |
| `content` | Chunk text content |
| `queryText` | Normalized text used for keyword/text search |
| `pageNumber` | Optional page/source location |
| `sectionPath`, `displayHeading`, `blockType` | Structural context of the chunk |
| `extractionMode`, `extractionConfidence` | How the chunk text was extracted |
| `embedding` | 1024-dimensional vector from Vertex AI `gemini-embedding-001` |

Atlas Vector Search index dimension must match `GEMINI_EMBEDDING_OUTPUT_DIMENSION`, default `1024`.

## Shares

`shares` stores direct read-only grants for `folder` or `document`. Shares are not removed when document visibility changes. Shared users can read private documents, but cannot update, delete, restore, star, move, or change visibility.

## Chat Data

Chat sessions and messages store prompt/response metadata, citations, and optional `suggestedQuestions` for assistant follow-up prompts. Chat context validation must use the same document-read access rules as document detail/search.
