# Tham chiếu REST API (API Reference)

**Phiên bản:** 1.0  
**Base URL (dev):** `http://localhost:4000/api`  
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
| `GET` | `/api/drive/trash` | — | Items có `deletedAt != null` |

---

## 5. Folders

Prefix `/api/folders`. Soft delete; xóa folder cascade subfolder + documents bên trong.

| Method | Path | Body / Ghi chú |
|--------|------|----------------|
| `POST` | `/api/folders` | `{ name, parentId?, color? }` |
| `GET` | `/api/folders/:id` | Chi tiết folder |
| `PATCH` | `/api/folders/:id` | `{ name?, parentId?, color? }` — chặn cycle khi di chuyển |
| `DELETE` | `/api/folders/:id` | Soft delete + cascade |
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
| `DELETE` | `/api/documents/:id` | Soft delete (quota không trừ cho đến khi xóa vĩnh viễn — phase sau) |
| `POST` | `/api/documents/:id/restore` | Restore từ Trash |
| `PATCH` | `/api/documents/:id/star` | Star |
| `DELETE` | `/api/documents/:id/star` | Unstar |

**Document `status`:** `pending` → `processing` → `ready` \| `failed`.

---

## 7. Admin API

Prefix `/api/admin`. Yêu cầu `role === "admin"`.

### 7.1 Thống kê

| Method | Path | Response `data` (tóm tắt) |
|--------|------|---------------------------|
| `GET` | `/api/admin/stats` | `totalUsers`, `activeUsers`, `disabledUsers`, `totalStorageUsedBytes`, `documentsByStatus`, `totalDocuments`, `totalFolders` |

### 7.2 Quản lý người dùng

| Method | Path | Mô tả |
|--------|------|--------|
| `GET` | `/api/admin/users` | Query: `page`, `limit`, `search` (email/displayName) |
| `GET` | `/api/admin/users/:id` | Chi tiết user |
| `PATCH` | `/api/admin/users/:id` | `{ storageQuotaBytes?, isDisabled? }` — không được tự disable chính mình |

User bị `isDisabled: true` → **403** trên folders/documents/drive/users; vẫn gọi được `GET /auth/me`.

---

## 8. Trạng thái triển khai (so với thiết kế đầy đủ)

| Module | API | Ghi chú |
|--------|-----|---------|
| Auth / User | Đã có | Google OAuth, admin group |
| Folders / Documents / Drive | Đã có | Upload presigned S3 |
| Admin | Đã có | Stats + user management |
| Shares | Chưa có | `shares` collection |
| Semantic search | Chưa có | Vector search |
| RAG Chat | Chưa có | `chat_sessions`, `chat_messages` |
| Processing worker | Chưa có | `processing` → `ready` |

---

## 9. Tài liệu liên quan

| Tài liệu | Nội dung |
|----------|----------|
| [`database_design.md`](./database_design.md) | Schema MongoDB |
| [`system_overview.md`](./system_overview.md) | Nghiệp vụ & NFR |
| [`post_deploy_setup.md`](./post_deploy_setup.md) | Deploy, OAuth, admin group |
| [`coding_standards.md`](./coding_standards.md) | Chuẩn code API |
