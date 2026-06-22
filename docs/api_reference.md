# Tham chiếu REST API (API Reference)

**Phiên bản:** 1.0  
**Base URL (dev):** `http://localhost:4000/api`  

## 14. Academic catalog and internal library

All endpoints require a Cognito bearer token. Access is granted when the email domain is listed in `ALLOWED_EMAIL_DOMAINS` or the exact email has an active admin-managed exception. Admin endpoints additionally require the Cognito `admin` group.

### Email access exceptions

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/admin/access-emails` | Paginated list with `search` and `status=active|inactive|all` |
| `POST` | `/api/admin/access-emails/bulk` | Create, reactivate, skip, or reject up to 500 email entries independently |
| `PATCH` | `/api/admin/access-emails/:id` | Update note or active status |
| `DELETE` | `/api/admin/access-emails/:id` | Soft-disable access while retaining audit history |

Bulk body: `{ "entries": [{ "email": "student@gmail.com", "note": "SE student" }] }`. Email matching is lowercase and exact. Revocation takes effect on the user's next API request because access is checked before every user synchronization. Removing an account's only access path does not delete its user record or files. An admin whose own address depends on an explicit exception cannot revoke that exception.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET/POST` | `/api/admin/majors` | List or create majors |
| `PATCH/DELETE` | `/api/admin/majors/:id` | Update or archive a major |
| `GET/POST` | `/api/admin/subjects` | List or create reusable subjects |
| `PATCH/DELETE` | `/api/admin/subjects/:id` | Update or archive a subject |
| `GET/POST` | `/api/admin/curriculum-courses` | List or create major-semester-subject mappings |
| `PATCH/DELETE` | `/api/admin/curriculum-courses/:id` | Update or archive a mapping |
| `GET` | `/api/catalog/majors` | List active majors |
| `GET` | `/api/catalog/majors/:majorId/curriculum` | List active curriculum, optionally by `semesterNumber` |
| `GET/PATCH` | `/api/users/me/academic-profile` | Read or select the current major, semester, and subjects |
| `GET` | `/api/library/documents` | Paginated internal library with academic filters |
| `GET` | `/api/library/documents/:id?download=true` | Internal metadata and optional presigned download URL |
| `GET` | `/api/forum/documents` | Internal forum feed for published APMS documents |
| `GET` | `/api/forum/documents/:id?download=true` | Forum document detail and optional presigned download URL |

`semesterNumber` is 1-9 and `(majorId, semesterNumber, subjectId)` is unique. A profile update accepts `{ majorId, currentSemester, currentSubjectIds }`; every subject must be active and mapped to that major and semester. Changing or archiving selected catalog data returns `409 ACADEMIC_CONFLICT`.

`POST /api/documents/upload-intents` requires an enrolled `curriculumCourseId` and publishes the completed upload as `internal`. `PATCH /api/documents/:id` accepts a valid mapping to publish an old document or `null` to make it personal. Library responses never expose `s3Key`. Internal documents may be explicitly selected for chat, while search/chat `all` remains limited to owned and directly shared documents.
`/api/forum/documents` is the internal feed view for the same `internal` documents, using the same academic filters as the library.

---
**Xác thực:** Cognito **ID token** (JWT) trong header `Authorization: Bearer <token>`

### Swagger UI (chỉ development)

| URL | Mô tả |
|-----|--------|
| [http://localhost:4000/api/docs](http://localhost:4000/api/docs) | Swagger UI — thử API, Authorize Bearer token |
| [http://localhost:4000/api/openapi.json](http://localhost:4000/api/openapi.json) | OpenAPI 3.0 JSON (sinh từ Zod validators + response schemas) |

Tắt khi `NODE_ENV=production`. Spec được tạo bởi `@asteasolutions/zod-to-openapi` trong [`api/src/openapi/`](../api/src/openapi/) — request body dùng chung file validators với runtime.

---

## 1. Quy ước chung

### 1.1 Response format

**Thành công:**
```json
{ "status": "success", "data": { ... } }
```

**Lỗi:**
```json
{ "status": "error", "message": "..." }
```

### 1.2 Middleware pipeline

| Loại route | Middleware |
|------------|------------|
| Public | Không |
| Protected (user) | `authenticate` → `resolveUser` → `requireActiveUser` |
| Auth profile | `authenticate` → `resolveUser` (không `requireActiveUser` — tài khoản disabled vẫn gọi được `/auth/me`) |
| Admin | `authenticate` → `resolveUser` → `requireActiveUser` → `requireAdmin` |

### 1.3 Vai trò (Admin)

- Mọi user đăng nhập **cùng một luồng Google OAuth**.
- Admin được nhận diện qua Cognito group **`admin`** → claim `cognito:groups` trong JWT → field `role: "admin"` trong MongoDB (sync mỗi lần gọi API có `resolveUser`).
- Chi tiết gán admin: [`post_deploy_setup.md`](./post_deploy_setup.md) mục 8.

---

## 2. Health

| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| `GET` | `/api/health` | Không | `{ service, uptime }` |
| `GET` | `/health` | Không | `{ status: "ok" }` (ngoài prefix `/api`) |

---

## 3. Auth & User profile

| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| `GET` | `/api/auth/me` | Bearer | Sync Cognito → MongoDB; trả profile + `role`, `isDisabled`, quota |
| `PATCH` | `/api/users/me` | Bearer + active | Body: `{ "displayName": string }` |

**`GET /api/auth/me` — `data` fields:** `id`, `cognitoSub`, `email`, `displayName`, `avatarUrl`, `role` (`user` \| `admin`), `isDisabled`, `storageUsedBytes`, `storageQuotaBytes`, `createdAt`, `updatedAt`.

---

## 4. Drive (aggregation)

Prefix `/api/drive`. Query nội dung thư mục hoặc view ảo.

| Method | Path | Query | Response `data` |
|--------|------|-------|-----------------|
| `GET` | `/api/drive` | `parentId?` (ObjectId hoặc bỏ qua = root) | `{ folders: [], documents: [] }` |
| `GET` | `/api/drive/starred` | — | Starred folders + documents |
| `GET` | `/api/drive/trash` | — | Items có `deletedAt != null`; mỗi item có thêm `permanentDeleteAt` |

**Trash retention:** Mặc định `TRASH_RETENTION_DAYS=30` (`api/.env`). Item trong Trash tự xóa vĩnh viễn sau 30 ngày nếu không restore. Cron hàng ngày: `pnpm purge:trash` (trong `api/`).

---

## 5. Folders

Prefix `/api/folders`. Soft delete; xóa folder cascade subfolder + documents bên trong.

| Method | Path | Body / Ghi chú |
|--------|------|----------------|
| `POST` | `/api/folders` | `{ name, parentId?, color? }` |
| `GET` | `/api/folders/:id` | Chi tiết folder |
| `PATCH` | `/api/folders/:id` | `{ name?, parentId?, color? }` — chặn cycle khi di chuyển |
| `DELETE` | `/api/folders/:id` | Soft delete + cascade |
| `DELETE` | `/api/folders/:id/permanent` | Xóa vĩnh viễn từ Trash (chỉ khi `deletedAt != null`) |
| `POST` | `/api/folders/:id/restore` | Khôi phục từ Trash |
| `PATCH` | `/api/folders/:id/star` | `isStarred: true` |
| `DELETE` | `/api/folders/:id/star` | `isStarred: false` |

---

## 6. Documents & Upload (presigned S3)

Prefix `/api/documents`.

### 6.1 Upload flow

1. `POST /api/documents/upload-intents` — tạo record `status: pending`, nhận `uploadUrl`, `s3Key`, `expiresIn`.
2. Client **PUT** file binary lên S3 (presigned URL).
3. `POST /api/documents/:id/complete` — verify S3, cập nhật quota, `status: processing` (worker embedding — phase sau).

**`POST /upload-intents` body:**

| Field | Type | Required |
|-------|------|----------|
| `originalFilename` | string | Có |
| `mimeType` | enum | Có — xem mục 6.2 |
| `fileSizeBytes` | number | Có |
| `folderId` | string \| null | Không |
| `title` | string | Không (mặc định = `originalFilename`) |

### 6.2 MIME được phép

- `application/pdf`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
- `application/vnd.openxmlformats-officedocument.presentationml.presentation` (PPTX)

Giới hạn kích thước: `MAX_UPLOAD_BYTES` (mặc định 50MB) và quota còn lại của user (`api/.env`).

### 6.3 CRUD & organization

| Method | Path | Mô tả |
|--------|------|--------|
| `GET` | `/api/documents/:id` | Metadata; query `download=true` → thêm `downloadUrl` (presigned GET) |
| `PATCH` | `/api/documents/:id` | `{ title?, tags?, folderId? }` |
| `DELETE` | `/api/documents/:id` | Soft delete (chuyển vào Trash; quota vẫn tính) |
| `DELETE` | `/api/documents/:id/permanent` | Xóa vĩnh viễn từ Trash — xóa S3, chunks, shares; giảm quota (trừ `pending`) |
| `POST` | `/api/documents/:id/restore` | Restore từ Trash |
| `PATCH` | `/api/documents/:id/star` | Star |
| `DELETE` | `/api/documents/:id/star` | Unstar |

**Document `status`:** `pending` → `processing` → `ready` \| `failed`.

---

## 7. Shares

Prefix `/api/shares`. Cho phép chia sẻ folder hoặc document với **nhiều người** trong một request.

### 7.1 Tạo share (batch)

`POST /api/shares` — **Body:**

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| `resourceType` | `"folder" \| "document"` | Có | Loại tài nguyên |
| `resourceId` | string (ObjectId) | Có | ID của folder/document |
| `sharedWithUserIds` | string[] (ObjectId[]) | Có | Danh sách người nhận (1–50 người) |

**Response `data`:** `{ created: ShareRecord[], skipped: number }` — `skipped` bao gồm: tự share cho mình, user không tồn tại, duplicate.

### 7.2 CRUD & listing

| Method | Path | Mô tả |
|--------|------|-------|
| `DELETE` | `/api/shares/:id` | Thu hồi 1 share record (chỉ owner) |
| `GET` | `/api/shares/with-me` | Danh sách tài nguyên được chia sẻ cho mình |
| `GET` | `/api/shares/by-me` | Danh sách tài nguyên mình đã chia sẻ (grouped by resource + danh sách người nhận) |
| `GET` | `/api/drive/shared` | Drive view "Shared with me" — trả `{ folders, documents }` |

### 7.3 Quyền kế thừa (Permission Inheritance)

Khi user B được chia sẻ một **folder**, tất cả subfolder và document bên trong đều được kế thừa quyền **đọc** (read-only). Backend dùng `$graphLookup` (ancestors khi kiểm tra quyền, descendants khi liệt kê nội dung) qua `checkShareAccess` / `findReadableDocument` / `findReadableFolder`.

Người được chia sẻ có thể: `GET /api/documents/:id` (kèm `?download=true`), `GET /api/folders/:id`, `GET /api/drive?parentId=<folderId>`, semantic search và RAG chat trên tài liệu đó. **Không** được PATCH/DELETE/star/upload trên tài nguyên của người khác.

---

## 7.5 User search (để tìm người nhận)

| Method | Path | Query params | Mô tả |
|--------|------|-------------|-------|
| `GET` | `/api/users/search` | `email` hoặc `displayName` | Tìm user active. Email = exact match, displayName = partial case-insensitive. Tối đa 10 kết quả |

**Response `data`:** `Array<{ id, displayName, email, avatarUrl }>` — chỉ expose thông tin public-safe.

---

## 8. Admin

Prefix `/api/admin`. Yêu cầu `role === "admin"`.

### 8.1 Thống kê

| Method | Path | Response `data` (tóm tắt) |
|--------|------|---------------------------|
| `GET` | `/api/admin/stats` | `totalUsers`, `activeUsers`, `disabledUsers`, `totalStorageUsedBytes`, `documentsByStatus`, `totalDocuments`, `totalFolders` |

### 8.2 Quản lý người dùng

| Method | Path | Mô tả |
|--------|------|--------|
| `GET` | `/api/admin/users` | Query: `page`, `limit`, `search` (email/displayName) |
| `GET` | `/api/admin/users/:id` | Chi tiết user |
| `PATCH` | `/api/admin/users/:id` | `{ storageQuotaBytes?, isDisabled? }` — không được tự disable chính mình |

User bị `isDisabled: true` → **403** trên folders/documents/drive/users; vẫn gọi được `GET /auth/me`.

---

## 9. Semantic Search

Prefix `/api/search`. Auth: Bearer + active user.

| Method | Path | Query params | Mô tả |
|--------|------|-------------|-------|
| `GET` | `/api/search` | `q` (string, 1–500 ký tự), `limit` (number, 1–20, default 10) | Vector search trên `document_chunks` của user (multi-tenancy filter theo `ownerId`) |

**Response `data`:** Danh sách kết quả, mỗi item gồm chunk nội dung, thông tin tài liệu gốc, và điểm similarity.

---

## 10. Chat (RAG Chatbot)

Prefix `/api/chat`. Auth: Bearer + active user. Giới hạn `CHAT_DAILY_LIMIT_PER_USER` messages/user/ngày (default 50).

### 10.1 Quản lý sessions

| Method | Path | Body / Ghi chú |
|--------|------|----------------|
| `POST` | `/api/chat/sessions` | Body: `{ title?, contextType, contextId?, contextIds? }` — xem 10.2 |
| `GET` | `/api/chat/sessions` | Danh sách sessions của user |
| `GET` | `/api/chat/sessions/:id` | Chi tiết session |
| `PATCH` | `/api/chat/sessions/:id` | `{ title?, isPinned? }` — ít nhất 1 trường |
| `DELETE` | `/api/chat/sessions/:id` | Xóa session và toàn bộ messages |

### 10.2 Tạo session — contextType

| `contextType` | Ý nghĩa | Trường bắt buộc thêm |
|---------------|---------|----------------------|
| `"all"` (default) | RAG trên toàn bộ tài liệu của user | — |
| `"folder"` | RAG trong một folder cụ thể | `contextId` (ObjectId folder) |
| `"document"` | RAG trên một tài liệu duy nhất | `contextId` (ObjectId document) |
| `"documents"` | RAG trên danh sách tài liệu | `contextIds` (ObjectId[], 1–20) |

### 10.3 Gửi tin nhắn

| Method | Path | Body | Mô tả |
|--------|------|------|-------|
| `POST` | `/api/chat/sessions/:id/messages` | `{ content: string (1–10000) }` | Gửi câu hỏi → RAG trả lời kèm citations |

**Response `data` (assistant message):**

```json
{
  "id": "...",
  "sessionId": "...",
  "role": "assistant",
  "content": "Câu trả lời từ AI...",
  "citations": [
    {
      "documentId": "...",
      "documentTitle": "Slide buổi 1.pdf",
      "pageNumber": 3,
      "excerpt": "Đoạn trích dẫn liên quan..."
    }
  ],
  "createdAt": "..."
}
```

---

## 11. Trạng thái triển khai

| Module | API | Ghi chú |
|--------|-----|---------|
| Auth / User | Có | Google OAuth, admin group |
| Folders / Documents / Drive | Có | Upload presigned S3 |
| Admin | Có | Stats + user management |
| Shares | Có | Batch share, permission inheritance, Shared with me view |
| User search | Có | `GET /api/users/search` — tìm người nhận |
| Semantic search | **Có** | `GET /api/search` — Vector search Atlas |
| RAG Chat | **Có** | `POST /api/chat/sessions`, messages + citations |
| Processing worker | **Có** | Background poll 30s: `processing → ready` |

---

## 9. Tài liệu liên quan

| Tài liệu | Nội dung |
|----------|----------|
| [`database_design.md`](./database_design.md) | Schema MongoDB |
| [`system_overview.md`](./system_overview.md) | Nghiệp vụ & NFR |
| [`post_deploy_setup.md`](./post_deploy_setup.md) | Deploy, OAuth, admin group |
| [`coding_standards.md`](./coding_standards.md) | Chuẩn code API |
