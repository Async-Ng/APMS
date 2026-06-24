# Database Design

APMS dùng MongoDB Atlas cho metadata, học vụ, sharing, chat history và vector search. File gốc nằm trên Amazon S3; MongoDB chỉ lưu metadata và chunks.

## Collections

| Collection | Mục đích |
| --- | --- |
| `users` | User local profile, role, disabled state, quota, academic profile |
| `access_emails` | Exact-email allowlist ngoài domain mặc định |
| `majors` | Ngành học |
| `subjects` | Môn học |
| `curriculumcourses` | Mapping ngành + học kỳ + môn |
| `folders` | Cây thư mục cá nhân |
| `documents` | Metadata tài liệu |
| `document_chunks` | Text chunks + embeddings |
| `shares` | Quyền read-only trực tiếp |
| `invites` | Invite records |
| `chat_sessions` | Chat sessions |
| `chat_messages` | Chat messages và citations |

## Documents

Important fields:

| Field | Type | Notes |
| --- | --- | --- |
| `ownerId` | ObjectId | Required, ref `users` |
| `folderId` | ObjectId \| null | Folder chứa tài liệu |
| `curriculumCourseId` | ObjectId \| null | Required for new uploads; legacy rows may still be null until assigned |
| `visibility` | `private | public` | Default `private` |
| `title` | string | Display title |
| `originalFilename` | string | Original upload name |
| `mimeType` | string | File MIME type |
| `s3Key` | string | Unique S3 object key |
| `fileSizeBytes` | number | Used for quota |
| `status` | `pending | processing | ready | failed` | Processing lifecycle |
| `pageCount` | number | Optional after extraction |
| `chunkCount` | number | Number of chunks |
| `tags` | string[] | User tags |
| `isStarred` | boolean | Owner-only star |
| `deletedAt` | Date \| null | Soft delete marker |

Indexes in source:

```js
{ ownerId: 1, folderId: 1 }
{ ownerId: 1, deletedAt: 1 }
{ ownerId: 1, isStarred: 1 }
{ status: 1 }
{ visibility: 1, curriculumCourseId: 1, deletedAt: 1 }
```

## Visibility Semantics

- `private`: owner can read/mutate; shared recipients can read through `/api/shares` access.
- `public`: active users can discover/read system-wide; only owner can mutate.
- Public listing filters out deleted documents and pending uploads.
- Public documents must have `curriculumCourseId` for normal discovery.

Legacy enum values are handled by `pnpm migrate:document-visibility`: old `personal` becomes `private`; old `internal` becomes `public`.

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
| `exact_course` | Same major, current semester, current subject |
| `same_subject_other_semester` | Same subject in another semester of the same major |
| `global_public` | Public but not profile-related |

## Document Chunks And Vector Search

`document_chunks` stores extracted chunks and Gemini embeddings.

| Field | Notes |
| --- | --- |
| `documentId` | Ref `documents` |
| `ownerId` | Used for access filtering |
| `text` | Chunk text |
| `pageNumber` | Optional page/source location |
| `embedding` | 1024-dimensional vector from Vertex AI `gemini-embedding-001` |

Atlas Vector Search index dimension must match `GEMINI_EMBEDDING_OUTPUT_DIMENSION`, default `1024`.

## Shares

`shares` stores direct read-only grants for `folder` or `document`. Shares are not removed when document visibility changes. Shared users can read private documents, but cannot update, delete, restore, star, move, or change visibility.

## Chat Data

Chat sessions and messages store prompt/response metadata and citations. Chat context validation must use the same document-read access rules as document detail/search.
