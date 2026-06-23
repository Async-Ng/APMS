# System Overview

APMS là hệ thống quản lý tài liệu học tập cá nhân và cộng đồng cho sinh viên. Backend hiện tại tập trung vào một surface tài liệu thống nhất: Documents.

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

Upload mới bắt buộc có `curriculumCourseId`. `visibility` mặc định là `private`; owner có thể đổi sang `public` nếu tài liệu đã gắn môn học hợp lệ.

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

Access của search/chat dùng cùng rule với document detail: owner đọc tài liệu của mình, recipient đọc tài liệu được share, active user đọc tài liệu public.

## Non-Functional Notes

- File gốc không trả trực tiếp từ API; API cấp presigned URL khi user có quyền đọc.
- Trash là soft delete; purge job xóa vĩnh viễn theo retention.
- Public discovery không làm lộ private/shared-only data.
- Web/mobile có thể cần phase cập nhật riêng sau API-only refactor; không giả định client đã hoàn tất migration nếu code chưa thể hiện.
