# Thiết kế Cơ sở Dữ liệu (Database Design)

**Phiên bản:** 1.1  
**Cơ sở dữ liệu:** MongoDB Atlas (kích hoạt Vector Search)  
**Mô hình tổ chức:** Kiểu Google Drive (Folder lồng nhau, Chia sẻ kế thừa, Soft Delete)

### Trạng thái triển khai API (Mongoose models)

| Collection | Model / API | Ghi chú |
|------------|-------------|---------|
| `users` | Có | `role`, `isDisabled`; sync Cognito group `admin` |
| `folders` | Có | `/api/folders`, `/api/drive` |
| `documents` | Có | `/api/documents`, upload presigned S3 |
| `document_chunks` | **Có** | `/api/search` — Vector search RAG pipeline |
| `shares` | **Có** | `/api/shares` (batch), `/api/drive/shared`, permission inheritance |
| `chat_sessions` | **Có** | `/api/chat/sessions` — RAG chat |
| `chat_messages` | **Có** | `/api/chat/sessions/:id/messages` — RAG chat |

Tham chiếu endpoint: [`api_reference.md`](./api_reference.md).

---

## 1. Sơ đồ tổ chức (Mental Model)

```
My Drive (root)
├── 📁 Kỳ 8/                       (folder, parentId: null)
│   ├── 📁 WDP301/                 (folder, parentId: "Kỳ 8")
│   │   ├── 📄 Slide buổi 1.pdf   (document, folderId: "WDP301")
│   │   └── 📄 SRS.docx           (document, folderId: "WDP301")
│   └── 📄 Thời khóa biểu.pdf     (document, folderId: "Kỳ 8")
├── ⭐ Starred                      (view ảo — filter isStarred: true)
├── 🗑️ Trash                        (view ảo — filter deletedAt != null)
└── 👥 Shared with me               (view ảo — query shares collection)
```

---

## 2. Danh sách Collections

| # | Collection | Vai trò |
|---|---|---|
| 1 | `users` | Tài khoản người dùng + quản lý Quota |
| 2 | `folders` | Thư mục lồng nhau (như Google Drive) |
| 3 | `documents` | Metadata tài liệu (file gốc lưu trên S3) |
| 4 | `document_chunks` | Nội dung được chunked + Vector Embedding (RAG) |
| 5 | `shares` | Quản lý quyền chia sẻ (folder hoặc document) |
| 6 | `chat_sessions` | Phiên hội thoại với AI Chatbot |
| 7 | `chat_messages` | Chi tiết từng tin nhắn + Citations |

---

## 3. Schema chi tiết

### 3.1 Collection: `users`

Lưu trữ thông tin tài khoản người dùng đăng nhập qua Amazon Cognito (Google federated).

| Field | Type | Ràng buộc | Mô tả |
|---|---|---|---|
| `_id` | `ObjectId` | PK | Primary key |
| `cognitoSub` | `String` | unique, required | Subject (`sub`) từ Cognito ID token |
| `email` | `String` | unique, required | Email tài khoản |
| `displayName` | `String` | required | Tên hiển thị |
| `avatarUrl` | `String` | | URL ảnh đại diện từ Google |
| `role` | `String (enum)` | default: `"user"` | `"user"` hoặc `"admin"`. Sync từ Cognito group `admin` mỗi lần đăng nhập |
| `isDisabled` | `Boolean` | default: false | Admin vô hiệu hóa → user không dùng được API (trừ `GET /auth/me`) |
| `storageUsedBytes` | `Number` | default: 0 | Dung lượng đã sử dụng (bytes). Cập nhật mỗi khi upload/xóa file |
| `storageQuotaBytes` | `Number` | default: 524288000 | Quota tối đa (default: 500MB) |
| `createdAt` | `Date` | auto | |
| `updatedAt` | `Date` | auto | |

**Indexes:**
- `cognitoSub`: unique
- `email`: unique
- `role`, `isDisabled` — lọc admin / tài khoản vô hiệu hóa

---

### 3.2 Collection: `folders`

Thư mục để tổ chức tài liệu. Hỗ trợ lồng nhau vô hạn cấp qua `parentId`.

| Field | Type | Ràng buộc | Mô tả |
|---|---|---|---|
| `_id` | `ObjectId` | PK | |
| `ownerId` | `ObjectId` | required, ref: users | Chủ sở hữu |
| `name` | `String` | required | Tên thư mục |
| `parentId` | `ObjectId or null` | ref: folders | `null` = nằm ở My Drive (gốc) |
| `color` | `String` | default: "#5F6368" | Màu icon folder (hex) |
| `isStarred` | `Boolean` | default: false | Ghim vào Starred |
| `deletedAt` | `Date or null` | default: null | Soft delete. Khác `null` = đang trong Trash |
| `createdAt` | `Date` | auto | |
| `updatedAt` | `Date` | auto | |

**Indexes:**
- Compound `(ownerId, parentId)` — liệt kê nội dung thư mục nhanh

---

### 3.3 Collection: `documents`

Metadata của mỗi tài liệu. File gốc được lưu trên AWS S3, không lưu trong DB.

| Field | Type | Ràng buộc | Mô tả |
|---|---|---|---|
| `_id` | `ObjectId` | PK | |
| `ownerId` | `ObjectId` | required, ref: users | Chủ sở hữu |
| `folderId` | `ObjectId or null` | ref: folders | `null` = nằm ở My Drive (gốc) |
| `title` | `String` | required | Tên hiển thị tùy chỉnh |
| `originalFilename` | `String` | required | Tên file gốc khi upload |
| `mimeType` | `String` | required | `application/pdf`, `application/vnd.openxmlformats-officedocument.*` |
| `s3Key` | `String` | required, unique | Key trỏ tới file gốc trên AWS S3 |
| `fileSizeBytes` | `Number` | required | Dung lượng file (bytes) |
| `status` | `String (enum)` | required | `pending` → `processing` → `ready` / `failed` |
| `pageCount` | `Number` | | Tổng số trang |
| `tags` | `String[]` | default: [] | Tags tùy chỉnh của người dùng |
| `isStarred` | `Boolean` | default: false | Ghim vào Starred |
| `deletedAt` | `Date or null` | default: null | Soft delete. Khác `null` = đang trong Trash |
| `createdAt` | `Date` | auto | |
| `updatedAt` | `Date` | auto | |

**Indexes:**
- Compound `(ownerId, folderId)` — liệt kê file trong folder
- `status` — lọc file đang xử lý
- `tags` — tìm kiếm theo tag
- `deletedAt` — lọc Trash

---

### 3.4 Collection: `document_chunks`

Các đoạn văn bản (chunks) được trích xuất và vector hóa từ tài liệu. Đây là **trung tâm của RAG pipeline**.

| Field | Type | Ràng buộc | Mô tả |
|---|---|---|---|
| `_id` | `ObjectId` | PK | |
| `documentId` | `ObjectId` | required, ref: documents | Tài liệu gốc |
| `ownerId` | `ObjectId` | required, ref: users | **Lưu trực tiếp để filter multi-tenancy không cần join** |
| `chunkIndex` | `Number` | required | Thứ tự chunk trong tài liệu (bắt đầu từ 0) |
| `content` | `String` | required | Nội dung văn bản của đoạn này |
| `pageNumber` | `Number` | | Trang chứa đoạn này (dùng để hiển thị Citation) |
| `embedding` | `Number[]` | required | Vector **1024** chiều từ Vertex AI `gemini-embedding-001` (L2-normalized) |

**Indexes:**
- `documentId` — xóa batch toàn bộ chunks khi document bị xóa
- `ownerId` — filter multi-tenancy
- `embedding` → **Atlas Vector Search Index**:
  ```json
  {
    "type": "vectorSearch",
    "fields": [{
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    }, {
      "type": "filter",
      "path": "ownerId"
    }]
  }
  ```

---

### 3.5 Collection: `shares`

Bảng trung gian quản lý quyền chia sẻ. Hỗ trợ chia sẻ cả **folder** hoặc **document**.

| Field | Type | Ràng buộc | Mô tả |
|---|---|---|---|
| `_id` | `ObjectId` | PK | |
| `resourceType` | `String (enum)` | required | `"folder"` hoặc `"document"` |
| `resourceId` | `ObjectId` | required | Ref → `folders._id` hoặc `documents._id` |
| `ownerId` | `ObjectId` | required, ref: users | Chủ sở hữu (người chia sẻ) |
| `sharedWithUserId` | `ObjectId` | required, ref: users | Người được chia sẻ |
| `permission` | `String (enum)` | default: "read" | `"read"` (v1 chỉ hỗ trợ read-only) |
| `sharedAt` | `Date` | auto | |

**Indexes:**
- Compound unique `(resourceType, resourceId, sharedWithUserId)` — ngăn duplicate share
- `sharedWithUserId` — query "Shared with me"
- `ownerId` — query "Shared by me"

**Quy tắc kế thừa (Phương án B — Google Drive style):**
> Khi user A chia sẻ một **folder** cho user B, toàn bộ subfolder và document bên trong folder đó cũng được user B truy cập. Backend kiểm tra quyền bằng cách dùng `$graphLookup` để đệ quy tìm tổ tiên (ancestors) của một item, sau đó kiểm tra xem có share record nào cho bất kỳ ancestor nào không.

---

### 3.6 Collection: `chat_sessions`

Phiên hội thoại giữa người dùng và AI Chatbot. `contextType` xác định phạm vi tài liệu dùng làm ngữ cảnh RAG.

| Field | Type | Ràng buộc | Mô tả |
|---|---|---|---|
| `_id` | `ObjectId` | PK | |
| `userId` | `ObjectId` | required, ref: users | |
| `title` | `String` | required, max 255 | Tiêu đề phiên |
| `contextType` | `String (enum)` | required, default: `"all"` | `"all"` \| `"folder"` \| `"document"` \| `"documents"` |
| `contextId` | `ObjectId or null` | default: null | ID folder/document khi `contextType` là `"folder"` hoặc `"document"` |
| `contextIds` | `ObjectId[]` | default: [] | Danh sách document IDs khi `contextType` là `"documents"` (1–20) |
| `isPinned` | `Boolean` | default: false | Ghim phiên lên đầu danh sách |
| `createdAt` | `Date` | auto | |
| `updatedAt` | `Date` | auto | |

**Indexes:**
- Compound `(userId, isPinned)` — liệt kê sessions, pinned lên trước

---

### 3.7 Collection: `chat_messages`

Chi tiết từng tin nhắn trong một phiên chat.

| Field | Type | Ràng buộc | Mô tả |
|---|---|---|---|
| `_id` | `ObjectId` | PK | |
| `sessionId` | `ObjectId` | required, ref: chat_sessions | |
| `role` | `String (enum)` | required | `"user"` hoặc `"assistant"` |
| `content` | `String` | required | Nội dung tin nhắn |
| `citations` | `Citation[]` | default: [] | Trích dẫn nguồn (chỉ có khi `role: "assistant"`) |
| `createdAt` | `Date` | auto | |

**Kiểu nhúng `Citation`:**
```typescript
interface Citation {
  documentId: ObjectId;    // Ref → documents._id
  documentTitle: string;   // Tên file (lưu sẵn để tránh join khi render)
  pageNumber: number;      // Số trang chứa thông tin
  excerpt: string;         // Đoạn trích dẫn liên quan
}
```

**Indexes:** `sessionId`

---

## 4. Các "View ảo" — Không cần Collection thêm

| View | Logic Query |
|---|---|
| **My Drive** | `folders({ ownerId: ME, parentId: null, deletedAt: null })` + `documents({ ownerId: ME, folderId: null, deletedAt: null })` |
| **Nội dung Folder X** | `folders({ ownerId: ME, parentId: X, deletedAt: null })` + `documents({ ownerId: ME, folderId: X, deletedAt: null })` |
| **Starred** | `folders/documents({ ownerId: ME, isStarred: true, deletedAt: null })` |
| **Trash** | `folders/documents({ ownerId: ME, deletedAt: {$ne: null} })` |
| **Shared with me** | `shares({ sharedWithUserId: ME })` → resolve resourceId + $graphLookup |
| **Shared by me** | `shares({ ownerId: ME })` → group by resource + populate user info |

---

## 5. Luồng RAG Pipeline

```
[User query]
     │
     ▼
Gemini Embeddings (gemini-embedding-001) → query_vector (1024 dims)
     │
     ▼
Atlas Vector Search:
  filter: { ownerId: userId }   ← đảm bảo multi-tenancy
  vector: query_vector
  limit: top-5 chunks
     │
     ▼
[context = 5 chunks.content]
     │
     ▼
Gemini Chat (gemini-2.5-flash, tự động fallback khi quota hết):
  system: "Chỉ dùng context bên dưới để trả lời..."
  context: chunks
  question: user query
     │
     ▼
[answer + citations]
```
