# APMS Main Flow Diagrams

Tài liệu này index **3 main flow chính của APMS** dùng để trình bày trong báo cáo và bảo vệ hội đồng. Các sơ đồ hiện dùng **draw.io flowchart chuẩn có swimlane**.

**Business source:** [SRS.md](./SRS.md) §3.1-3.8 và [system_overview.md](./system_overview.md)

## Quy Ước Sơ Đồ

Mỗi flow được vẽ riêng thành một file `.drawio` editable và một file `.png` để chèn vào slide/báo cáo.

| Ký hiệu | Ý nghĩa |
| --- | --- |
| Terminator | Bắt đầu / kết thúc flow |
| Manual Input | Thao tác của sinh viên hoặc admin |
| Process | Bước APMS Web/API/Worker xử lý |
| Decision | Điều kiện rẽ nhánh như quyền truy cập, quota, evidence gate |
| Data Store | MongoDB/S3 data như users, documents, document_chunks |
| Document | File học tập PDF/DOCX/PPTX |
| External System | Google/Cognito, S3, Gemini, Atlas Vector Search |

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

- **PNG:** [diagrams/apms-main-flow-1-access-profile-flowchart.png](./diagrams/apms-main-flow-1-access-profile-flowchart.png)
- **Source:** [diagrams/apms-main-flow-1-access-profile-flowchart.drawio](./diagrams/apms-main-flow-1-access-profile-flowchart.drawio)

## Flow 2 — Vòng Đời Tài Liệu Học Tập

**SRS:** FR-013-FR-034, FR-061; BR-006-BR-010, BR-015, BR-027

Sinh viên upload PDF/DOCX/PPTX và bắt buộc chọn course slot. APMS validate loại file, quota và course slot, tạo presigned upload, lưu metadata, worker extract/chunk/embed, rồi đưa tài liệu về trạng thái ready trong Drive. Flow cũng thể hiện thao tác quản lý, chia sẻ read-only, public library, và các nhánh lỗi upload/extract.

- **PNG:** [diagrams/apms-main-flow-2-document-lifecycle-flowchart.png](./diagrams/apms-main-flow-2-document-lifecycle-flowchart.png)
- **Source:** [diagrams/apms-main-flow-2-document-lifecycle-flowchart.drawio](./diagrams/apms-main-flow-2-document-lifecycle-flowchart.drawio)

## Flow 3 — Search & RAG Chat Có Citation

**SRS:** FR-035-FR-045, FR-062; BR-005, BR-022, BR-025

Sinh viên nhập search query hoặc câu hỏi Chat AI, chọn context, APMS kiểm tra quyền đọc, tạo query variants/embedding, retrieval bằng vector + lexical, rerank/evidence gate, rồi Gemini sinh câu trả lời có citation hợp lệ. Khi sinh viên click citation, document viewer mở đúng tài liệu/trang/chunk; PDF/DOCX highlight best-effort, PPTX mở đúng slide/text view.

- **PNG:** [diagrams/apms-main-flow-3-search-rag-citation-flowchart.png](./diagrams/apms-main-flow-3-search-rag-citation-flowchart.png)
- **Source:** [diagrams/apms-main-flow-3-search-rag-citation-flowchart.drawio](./diagrams/apms-main-flow-3-search-rag-citation-flowchart.drawio)
