# System Overview

Business rules: xem `docs/SRS.md` (FR/BR/NFR). APMS là hệ thống quản lý tài liệu học tập cá nhân và cộng đồng cho sinh viên. Backend hiện tại tập trung vào một surface tài liệu thống nhất: Documents.

## Mục Tiêu

- Cho phép sinh viên upload, lưu trữ, phân loại và tìm lại tài liệu theo môn học.
- Giữ dữ liệu riêng tư an toàn qua owner/share access.
- Cho phép tài liệu public được khám phá trong toàn hệ thống, ưu tiên theo hồ sơ học vụ.
- Hỗ trợ semantic search và RAG chat có trích dẫn từ tài liệu được phép đọc.

## Main Flow Diagrams

Ba luồng nghiệp vụ chính được vẽ bằng UML Activity Diagram có swimlane trong `docs/diagrams`:

| Flow | PNG dùng cho báo cáo | Source chỉnh sửa |
| --- | --- | --- |
| Truy cập hệ thống & hồ sơ học vụ | `apms-main-flow-1-access-profile-activity.png` | `apms-main-flow-1-access-profile-activity.drawio` |
| Vòng đời tài liệu học tập | `apms-main-flow-2-document-lifecycle-activity.png` | `apms-main-flow-2-document-lifecycle-activity.drawio` |
| Search & RAG Chat có citation | `apms-main-flow-3-search-rag-citation-activity.png` | `apms-main-flow-3-search-rag-citation-activity.drawio` |

Các main flow có thêm bộ sub-flow chi tiết để trình bày từng luồng vận hành thật:

| Main flow | Sub-flow detail diagrams |
| --- | --- |
| System Access & Academic Profile | `apms-subflow-1a-login-access-activity.png`, `apms-subflow-1b-academic-profile-activity.png`, `apms-subflow-1c-admin-catalog-access-activity.png` |
| Learning Document Lifecycle | `apms-subflow-2a-upload-processing-activity.png`, `apms-subflow-2b-drive-management-activity.png`, `apms-subflow-2c-share-public-trash-activity.png` |
| Search & RAG Chat With Citations | `apms-subflow-3a-semantic-search-activity.png`, `apms-subflow-3b-rag-chat-answer-activity.png`, `apms-subflow-3c-citation-deep-link-activity.png` |
## C4 Model - C2 Container Diagram

Sơ đồ C2 theo C4 Model mô tả các container chính của APMS và hệ thống ngoài mà chúng giao tiếp. Sơ đồ này dùng để trình bày kiến trúc ở mức container, không thay thế các main flow nghiệp vụ.

| Diagram | PNG dùng cho báo cáo | Source chỉnh sửa |
| --- | --- | --- |
| APMS C2 Container Diagram | `apms-c2-container.png` | `apms-c2-container.drawio` |

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
- `curriculumsemesters`: junction curriculum ↔ học kỳ
- `courseslots`: mapping curriculum + `semesterId` + môn

Admin quản lý qua `/api/admin` (curricula, semesters, gán kỳ theo curriculum, course slots). User đọc catalog qua `/api/catalog`. Hồ sơ học vụ (`PATCH /api/users/me/academic-profile`) chỉ cần `curriculumId`; khi upload/chỉnh tài liệu, `courseSlotId` phải thuộc curriculum đó.

Admin có thể promote/demote user qua `PATCH /api/admin/users/:id` với `role`; API đồng bộ Cognito group `admin` và `users.role`.

## AI / RAG Pipeline

```text
Upload complete
  -> Worker lấy file từ S3
  -> Extract nội dung thành Markdown có cấu trúc:
     - PDF: Gemini vision parse từng trang -> Markdown (bảng -> Markdown table,
       công thức -> LaTeX, code -> fenced block, heading -> #, hình/chart -> [Hình: ...]).
       DOC_VISION_PAGE_STRATEGY=all parse mọi trang; =auto chỉ parse trang scan/có ảnh/bảng/công thức.
     - DOCX: mammoth HTML -> Markdown (turndown + GFM); ảnh nhúng mô tả bằng vision, chèn đúng vị trí.
     - PPTX: mỗi slide -> "## Slide N — title" + bullets; ảnh map về đúng slide qua rels.
  -> Chunk theo cấu trúc (heading/section/bảng/code/công thức; không gọi embedding khi chunk)
  -> Gemini embedding: gemini-embedding-001, 1024 dims (batch EMBED_BATCH_SIZE)
  -> Lưu document_chunks vào MongoDB Atlas

Search hoặc Chat
  -> Rewrite query theo lịch sử chat khi cần; tạo query variants và keyword query
  -> Hybrid retrieval: Atlas Vector Search + lexical exact match theo access scope
  -> Với summary/FAQ/study guide, bổ sung coverage chunks đại diện theo document/page/section
  -> Chấm hybrid score, rerank bằng Gemini lite model, rồi chọn context đa dạng để tránh trùng cụm nguồn
  -> Evidence gate: nếu nguồn truy xuất quá yếu hoặc không có context, trả lời rằng tài liệu chưa đủ thông tin
  -> Gemini chat model sinh câu trả lời
  -> Normalize citation markers theo retrieved chunks; loại marker không khớp nguồn hợp lệ
  -> Sinh suggested questions cho chat mode
  -> Trả citations theo document/page/chunk kèm deep link và suggestedQuestions
```

Chat tạo session với `contextType` `all | folder | document | documents` (FR-040) và hỗ trợ mode `chat | summary | faq | study_guide` (FR-043). Câu trả lời ở mọi mode ưu tiên ngắn gọn, tự nhiên như hội thoại và dựa trên tài liệu được truy xuất; mode `chat` trả thêm tối đa 3 `suggestedQuestions`, còn các preset mode trả mảng gợi ý rỗng. Mỗi user giới hạn 50 lượt hỏi/ngày (FR-062). Access của search/chat dùng cùng rule với document detail: owner đọc tài liệu của mình, recipient đọc tài liệu được share, active user đọc tài liệu public (BR-022).

## Non-Functional Notes

- Giới hạn & chính sách (xem SRS):
  - Upload tối đa 50 MB/tệp; quota 500 MB/người (FR-014, BR-009). Loại tệp: PDF, DOCX, PPTX (FR-013).
  - Trash là soft delete; purge job xóa vĩnh viễn sau 30 ngày (BR-027).
  - Chat 50 lượt/người/ngày (FR-062, BR-025).
  - Lời mời chia sẻ hết hạn sau 7 ngày (BR-015); link tải presigned hết hạn sau 15 phút.
  - Đăng nhập giới hạn theo allowlist domain mặc định `fpt.edu.vn`, `fe.edu.vn` + access emails ngoại lệ (BR-002).
- File gốc không trả trực tiếp từ API; API cấp presigned URL khi user có quyền đọc.
- Public discovery không làm lộ private/shared-only data.
- Web/mobile đã dùng naming mới (`curriculumId`, `courseSlotId`) và route catalog/admin theo curricula.
