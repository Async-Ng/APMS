# API Reference

Base URL local: `http://localhost:4000/api`.

Tài liệu này mô tả API hiện tại sau refactor Documents. Source of truth là `api/src/routes/index.ts`, validators trong `api/src/validators`, models trong `api/src/models`, và services trong `api/src/services`.

## Route Map

| Route | Mục đích |
| --- | --- |
| `GET /api/health` | Health check |
| `/api/auth` | Auth callback, current user, profile setup |
| `/api/admin` | Admin users, stats, access emails |
| `/api/users` | User profile |
| `/api/catalog` | Major, subject, curriculum-course catalog |
| `/api/folders` | Folder operations |
| `/api/documents` | Unified document list and document operations |
| `/api/shares` | Direct read-only sharing |
| `/api/invites` | Invite management |
| `/api/search` | Semantic search |
| `/api/chat` | RAG chat |

Removed routes: `/api/drive`, `/api/library`, and `/api/forum` are not mounted. Use `/api/documents` instead.

## Auth And Access

Most routes require Cognito JWT auth. Disabled users are blocked from protected product routes, while auth/me-style identity checks can still be used by the client to understand account state.

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
| `majorId` | ObjectId | none | Public academic filter |
| `semesterNumber` | `1..9` | none | Public academic filter |
| `subjectId` | ObjectId | none | Public academic filter |
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
      "curriculumCourseId": "courseId",
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
      "curriculumCourse": {
        "id": "courseId",
        "semesterNumber": 1,
        "major": {},
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
  "curriculumCourseId": "courseObjectId",
  "visibility": "private"
}
```

Rules:

- `curriculumCourseId` is required for new uploads.
- `visibility` is optional and defaults to `private`.
- `visibility` must be `private` or `public`.
- Uploading a document without a course is rejected.

After S3 upload, call:

`POST /api/documents/:id/complete`

The API verifies the S3 object, updates quota, and moves the document into processing.

## Document Operations

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/documents/:id` | Read metadata; `?download=true` adds presigned download URL when allowed |
| `PATCH` | `/api/documents/:id` | Owner updates `title`, `tags`, `folderId`, `curriculumCourseId`, `visibility` |
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
  "curriculumCourseId": "courseObjectId",
  "visibility": "public"
}
```

`curriculumCourseId = null` is not accepted in update payloads.

## Folders

`/api/folders` manages owned folders. Folders support create, read, update, soft delete, permanent delete, restore, star, and unstar. Folder contents are listed through `GET /api/documents?view=my&parentId=<folderId>` or shared folder browsing through `view=shared`.

## Shares

`/api/shares` remains active in this refactor. Shares grant read-only access to a document or folder. Shared recipients can read private documents through the share path and can use shared content in search/chat where the backend access rule allows it.

## Catalog And Academic Profile

`/api/catalog` exposes active majors and curriculum courses for authenticated users. Documents reference `curriculumCourseId`, which links a subject to a major and semester. Public document discovery uses this mapping for `match=auto`, exact-course matches, related same-subject matches, and global public results.

### `GET /api/catalog/majors`

Returns active majors sorted by code.

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

### `GET /api/catalog/majors/{majorId}/curriculum`

Returns active curriculum courses for the major. Optional query `semesterNumber` (`1..9`) filters to one semester.

```json
{
  "status": "success",
  "data": [
    {
      "id": "507f1f77bcf86cd799439012",
      "majorId": "507f1f77bcf86cd799439011",
      "semesterNumber": 1,
      "subjectId": "507f1f77bcf86cd799439013",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z",
      "major": { "id": "...", "code": "SE", "name": "...", "description": "", "isActive": true, "createdAt": "...", "updatedAt": "..." },
      "subject": { "id": "...", "code": "PRF192", "name": "...", "description": "", "isActive": true, "createdAt": "...", "updatedAt": "..." }
    }
  ]
}
```

Returns `404` when `majorId` is missing or inactive.

### `GET /api/users/me/academic-profile`

Returns the signed-in user's academic profile.

```json
{
  "status": "success",
  "data": {
    "major": { "id": "...", "code": "SE", "name": "...", "description": "", "isActive": true, "createdAt": "...", "updatedAt": "..." },
    "currentSemester": 1,
    "currentSubjects": [
      { "id": "...", "code": "PRF192", "name": "...", "description": "", "isActive": true, "createdAt": "...", "updatedAt": "..." }
    ],
    "isComplete": true
  }
}
```

`isComplete` is `true` when major, semester, and at least one subject are set.

### `PATCH /api/users/me/academic-profile`

Updates the signed-in user's academic profile. Every subject must be active and belong to the selected major and semester in the curriculum catalog.

```json
{
  "majorId": "507f1f77bcf86cd799439011",
  "currentSemester": 1,
  "currentSubjectIds": ["507f1f77bcf86cd799439013"]
}
```

`currentSubjectIds` must contain at least one unique ObjectId (max 30). Returns the same shape as `GET`. Validation failures return `400` with `CURRICULUM_NOT_ENROLLED` when a subject is outside the selected major/semester curriculum.

## Search And Chat

Search and chat use the same access model as document detail:

- Private scope includes owned and directly shared documents.
- Public scope can retrieve public documents system-wide.
- Chat context checks document readability before using any document as grounding context.

Embeddings are created with Vertex AI `gemini-embedding-001` at 1024 dimensions and stored in MongoDB Atlas Vector Search.

## Migration Notes

Run this after deploying the document visibility refactor:

```bash
cd api
pnpm migrate:document-visibility
```

The migration maps legacy `personal` values to `private` and legacy `internal` values to `public`. It does not modify S3 objects, chunks, shares, folders, or assign missing courses to old records.
