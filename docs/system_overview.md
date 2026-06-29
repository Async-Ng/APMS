# System Overview

Business rules: xem `docs/SRS.md` (FR/BR/NFR). APMS là hệ thống quản lý tài liệu học tập cá nhân và cộng đồng cho sinh viên. Backend hiện tại tập trung vào một surface tài liệu thống nhất: Documents.

## Mục Tiêu

- Cho phép sinh viên upload, lưu trữ, phân loại và tìm lại tài liệu theo môn học.
- Giữ dữ liệu riêng tư an toàn qua owner/share access.
- Cho phép tài liệu public được khám phá trong toàn hệ thống, ưu tiên theo hồ sơ học vụ.
- Hỗ trợ semantic search và RAG chat có trích dẫn từ tài liệu được phép đọc.

## Các Khối Chính

| Khối | Vai trò |
| --- | --- |
| Web | Next.js client cho trải nghiệm desktop/web |
| Mobile | Expo client cho trải nghiệm mobile |
| API | Express REST API, auth, validation, business logic |
| MongoDB Atlas | Metadata, catalog, chunks, chat history, vector search |
| Amazon S3 | Lưu file gốc qua presigned URL |
| Amazon Cognito | Xác thực người dùng |
| Amazon SES | Email invite/notification |
| Vertex AI Gemini | Embedding, chat, vision extraction |
| AWS CDK | Provision Cognito/S3/SES-related resources |

## Documents Unified Surface

`GET /api/documents` thay thế ba surface cũ Drive/Library/Forum. API này trả cùng một response shape:

```json
{
  "folders": [],
  "documents": [],
  "pagination": {}
}
```

Các view:

| View | Ý nghĩa |
| --- | --- |
| `my` | Folder và document thuộc owner |
| `shared` | Tài nguyên được share trực tiếp |
| `public` | Tài liệu public toàn hệ thống, có filter học vụ |
| `starred` | Tài nguyên owner đã star |
| `trash` | Tài nguyên owner đã xóa mềm |

Upload mới bắt buộc có `courseSlotId`. `visibility` mặc định là `private`; owner có thể đổi sang `public` nếu tài liệu đã gắn môn học hợp lệ.

## Academic Catalog

Học vụ dùng entity `Semester` (không còn số học kỳ cứng 1–9):

- `semesters`: học kỳ global (`code`, `name`, `sortOrder`)
- `curriculumsemesters`: junction ngành ↔ học kỳ
- `CourseSlots`: mapping ngành + `semesterId` + môn

Admin quản lý qua `/api/admin` (majors, semesters, gán kỳ theo ngành, CTĐT). User đọc catalog qua `/api/catalog`. Hồ sơ học vụ (`PATCH /api/users/me/academic-profile`) dùng `currentSemesterId` thay số nguyên.

Admin có thể promote/demote user qua `PATCH /api/admin/users/:id` với `role`; API đồng bộ Cognito group `admin` và `users.role`.

## AI / RAG Pipeline

```text
Upload complete
  -> Worker lấy file từ S3
  -> Extract text bằng parser phù hợp
  -> Gemini vision mô tả/OCR phần ảnh khi bật DOC_VISION_ENABLED
  -> Chunk tài liệu
  -> Gemini embedding: gemini-embedding-001, 1024 dims
  -> Lưu document_chunks vào MongoDB Atlas

Search hoặc Chat
  -> Embed query bằng Gemini
  -> Atlas Vector Search theo access scope
  -> Rerank/rewrite khi cần bằng Gemini lite model
  -> Gemini chat model sinh câu trả lời
  -> Trả citations theo document/page/chunk
```

Chat tạo session với `contextType` `all | folder | document | documents` (FR-040) và hỗ trợ mode `chat | summary | faq | study_guide` (FR-043). Mỗi user giới hạn 50 lượt hỏi/ngày (FR-062). Access của search/chat dùng cùng rule với document detail: owner đọc tài liệu của mình, recipient đọc tài liệu được share, active user đọc tài liệu public (BR-022).

## Non-Functional Notes

- Giới hạn & chính sách (xem SRS):
  - Upload tối đa 50 MB/tệp; quota 500 MB/người (FR-014, BR-009). Loại tệp: PDF, DOCX, PPTX (FR-013).
  - Trash là soft delete; purge job xóa vĩnh viễn sau 30 ngày (BR-027).
  - Chat 50 lượt/người/ngày (FR-062, BR-025).
  - Lời mời chia sẻ hết hạn sau 7 ngày (BR-015); link tải presigned hết hạn sau 15 phút.
  - Đăng nhập giới hạn theo allowlist domain mặc định `fpt.edu.vn`, `fe.edu.vn` + access emails ngoại lệ (BR-002).
- File gốc không trả trực tiếp từ API; API cấp presigned URL khi user có quyền đọc.
- Public discovery không làm lộ private/shared-only data.
- Web/mobile có thể cần phase cập nhật riêng sau API-only refactor; không giả định client đã hoàn tất migration nếu code chưa thể hiện.
