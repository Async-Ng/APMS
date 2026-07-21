# APMS Main Flow Diagrams

Tài liệu này index **3 main flow chính của APMS** dùng để trình bày trong báo cáo và bảo vệ hội đồng. Các sơ đồ hiện dùng **UML Activity Diagram có swimlane**, vẽ bằng draw.io.

**Business source:** [SRS.md](./SRS.md) §3.1-3.8 và [system_overview.md](./system_overview.md)

## Quy Ước Sơ Đồ

Mỗi flow được vẽ riêng thành một file `.drawio` editable và một file `.png` để chèn vào slide/báo cáo.

| Ký hiệu UML Activity | Ý nghĩa |
| --- | --- |
| Initial node | Điểm bắt đầu của activity |
| Activity final node | Điểm kết thúc của activity |
| Action | Thao tác của sinh viên/admin hoặc bước xử lý của APMS |
| Decision / Merge | Điều kiện rẽ nhánh như quyền truy cập, quota, evidence gate |
| Control flow | Mũi tên thể hiện thứ tự xử lý, có guard dạng `[Có]`, `[Không]`, `[Fail]` khi cần |
| Object node / Data store | File học tập hoặc dữ liệu như users, documents, document_chunks |

Swimlane trong mỗi sơ đồ:

| Lane | Vai trò |
| --- | --- |
| Người dùng / Admin | Điểm tương tác trực tiếp của sinh viên hoặc quản trị viên |
| APMS Web / API / Worker | Logic xử lý chính của hệ thống |
| External Services | Dịch vụ bên ngoài |
| Database / Storage | Dữ liệu và lưu trữ |

## Flow 1 — Truy Cập Hệ Thống & Hồ Sơ Học Vụ

**SRS:** FR-001-FR-012, BR-002

Sinh viên đăng nhập bằng Google/Cognito. APMS kiểm tra domain/email được phép, đồng bộ user, yêu cầu chọn curriculum trong hồ sơ học vụ, sau đó đưa sinh viên vào Drive khi hồ sơ hợp lệ. Flow cũng thể hiện phần admin quản lý catalog, quota, user và access email.

- **PNG:** [diagrams/apms-main-flow-1-access-profile-activity.png](./diagrams/apms-main-flow-1-access-profile-activity.png)
- **Source:** [diagrams/apms-main-flow-1-access-profile-activity.drawio](./diagrams/apms-main-flow-1-access-profile-activity.drawio)

## Flow 2 — Vòng Đời Tài Liệu Học Tập

**SRS:** FR-013-FR-034, FR-061; BR-006-BR-010, BR-015, BR-027

Sinh viên upload PDF/DOCX/PPTX và bắt buộc chọn course slot. APMS validate loại file, quota và course slot, tạo presigned upload, lưu metadata, worker extract/chunk/embed, rồi đưa tài liệu về trạng thái ready trong Drive. Flow cũng thể hiện thao tác quản lý, chia sẻ read-only, public library, và các nhánh lỗi upload/extract.

- **PNG:** [diagrams/apms-main-flow-2-document-lifecycle-activity.png](./diagrams/apms-main-flow-2-document-lifecycle-activity.png)
- **Source:** [diagrams/apms-main-flow-2-document-lifecycle-activity.drawio](./diagrams/apms-main-flow-2-document-lifecycle-activity.drawio)

## Flow 3 — Search & RAG Chat Có Citation

**SRS:** FR-035-FR-045, FR-062; BR-005, BR-022, BR-025

Sinh viên nhập search query hoặc câu hỏi Chat AI, chọn context, APMS kiểm tra quyền đọc, tạo query variants/embedding, retrieval bằng vector + lexical, rerank/evidence gate, rồi Gemini sinh câu trả lời có citation hợp lệ. Khi sinh viên click citation, document viewer mở đúng tài liệu/trang/chunk; PDF/DOCX highlight best-effort, PPTX mở đúng slide/text view.

- **PNG:** [diagrams/apms-main-flow-3-search-rag-citation-activity.png](./diagrams/apms-main-flow-3-search-rag-citation-activity.png)
- **Source:** [diagrams/apms-main-flow-3-search-rag-citation-activity.drawio](./diagrams/apms-main-flow-3-search-rag-citation-activity.drawio)

## Detailed Sub-flow Diagrams

Các sơ đồ dưới đây bóc tách 3 main flow thành những luồng vận hành thực tế nhỏ hơn. Chúng vẫn dùng UML Activity Diagram có swimlane và cùng notation với bộ main flow.

### Flow 1 — System Access & Academic Profile

| Sub-flow | Nội dung | PNG | Source |
| --- | --- | --- | --- |
| 1A — Login & Access Control | Google/Cognito login, allowlist/domain check, active user check, reject paths | [PNG](./diagrams/apms-subflow-1a-login-access-activity.png) | [drawio](./diagrams/apms-subflow-1a-login-access-activity.drawio) |
| 1B — Academic Profile Setup | Load profile, choose curriculum, validate active curriculum, save profile, enter Drive | [PNG](./diagrams/apms-subflow-1b-academic-profile-activity.png) | [drawio](./diagrams/apms-subflow-1b-academic-profile-activity.drawio) |
| 1C — Admin Catalog & Access Management | Admin role check, manage users/quota/access emails/catalog, integrity guards | [PNG](./diagrams/apms-subflow-1c-admin-catalog-access-activity.png) | [drawio](./diagrams/apms-subflow-1c-admin-catalog-access-activity.drawio) |

### Flow 2 — Learning Document Lifecycle

| Sub-flow | Nội dung | PNG | Source |
| --- | --- | --- | --- |
| 2A — Upload & Document Processing | Course-bound upload, validation, S3 upload, metadata, extract/chunk/embed, ready/fail | [PNG](./diagrams/apms-subflow-2a-upload-processing-activity.png) | [drawio](./diagrams/apms-subflow-2a-upload-processing-activity.drawio) |
| 2B — Drive Management | Unified Drive listing, filter/sort/search, detail, read-only vs owner edit, star/move/update | [PNG](./diagrams/apms-subflow-2b-drive-management-activity.png) | [drawio](./diagrams/apms-subflow-2b-drive-management-activity.drawio) |
| 2C — Sharing, Public Visibility & Trash | Read-only share/invite, revoke/public/trash/restore/permanent delete paths | [PNG](./diagrams/apms-subflow-2c-share-public-trash-activity.png) | [drawio](./diagrams/apms-subflow-2c-share-public-trash-activity.drawio) |

### Flow 3 — Search & RAG Chat With Citations

| Sub-flow | Nội dung | PNG | Source |
| --- | --- | --- | --- |
| 3A — Semantic Search | Query, scope, access filter, Gemini embedding, Atlas Vector Search, permitted results | [PNG](./diagrams/apms-subflow-3a-semantic-search-activity.png) | [drawio](./diagrams/apms-subflow-3a-semantic-search-activity.drawio) |
| 3B — RAG Chat Answer Generation | Chat session, daily limit, context validation, retrieval/rerank, evidence gate, Gemini answer, citation normalization | [PNG](./diagrams/apms-subflow-3b-rag-chat-answer-activity.png) | [drawio](./diagrams/apms-subflow-3b-rag-chat-answer-activity.drawio) |
| 3C — Citation Deep Link Opening | Citation context, document access, chunk lookup, viewer deep link, PDF/DOCX highlight, PPTX slide view | [PNG](./diagrams/apms-subflow-3c-citation-deep-link-activity.png) | [drawio](./diagrams/apms-subflow-3c-citation-deep-link-activity.drawio) |
