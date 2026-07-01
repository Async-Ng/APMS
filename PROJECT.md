# APMS - Project Overview

APMS (Academic Personal Management System) là hệ thống quản lý tài liệu học tập cho sinh viên. Trọng tâm hiện tại là backend API: tài liệu được gom về một surface thống nhất, bắt buộc gắn với môn học, có phân quyền `private` hoặc `public`, và có thể dùng cho semantic search/RAG chat.

## Luồng chính

```text
Upload tài liệu
  -> POST /api/documents/upload-intents
  -> S3 presigned PUT
  -> POST /api/documents/:id/complete
  -> Worker extract text/vision
  -> Chunking
  -> Vertex AI Gemini embedding (gemini-embedding-001, 1024 dims)
  -> MongoDB Atlas Vector Search

Search / Chat
  -> Prompt hoặc keyword
  -> Gemini embedding
  -> Atlas Vector Search theo quyền truy cập
  -> Gemini chat model trả lời với citations
```

## Document Model Hiện Tại

- Mọi upload mới bắt buộc có `courseSlotId`.
- `visibility = "private" | "public"`.
- `private`: chỉ owner và người được share trực tiếp đọc được.
- `public`: active users trong hệ thống có thể tìm thấy; list mặc định vẫn ưu tiên CTĐT trong hồ sơ học vụ.
- API list duy nhất là `GET /api/documents`.
- Các route cũ `/api/drive`, `/api/library`, `/api/forum` đã bị gỡ khỏi route mount.

## API Surface

| Nhóm | Route | Ghi chú |
| --- | --- | --- |
| Auth | `/api/auth` | Cognito JWT, sync user local |
| Admin | `/api/admin` | Users, stats, access emails, academic catalog (curricula, semesters, course slots) |
| Catalog | `/api/catalog` | Curricula, semesters, course slots (read) |
| Folders | `/api/folders` | Folder CRUD cho workspace cá nhân/share |
| Documents | `/api/documents` | List unified, upload, detail, update, delete, restore, star |
| Shares | `/api/shares` | Chia sẻ read-only document/folder |
| Search | `/api/search` | Semantic search theo quyền truy cập |
| Chat | `/api/chat` | RAG chat session/message |

`GET /api/documents` hỗ trợ `view=my|shared|public|starred|trash`, `search`, `sort`, `page`, `limit`, `parentId`, và các filter học vụ cho public view.

## Giới Hạn & Chính Sách

Nguồn nghiệp vụ đầy đủ: [docs/SRS.md](./docs/SRS.md) (FR/BR/NFR).

| Hạng mục | Giá trị | Tham chiếu |
| --- | --- | --- |
| Dung lượng mỗi tệp | 50 MB | FR-014, BR-009 |
| Quota lưu trữ mỗi người | 500 MB | BR-009 |
| Loại tệp cho phép | PDF, DOCX, PPTX | FR-013, BR-008 |
| Thùng rác tự xóa | sau 30 ngày | BR-027 |
| Giới hạn chat AI | 50 lượt/người/ngày | FR-062, BR-025 |
| Lời mời chia sẻ | hết hạn sau 7 ngày | BR-015 |
| Link tải tệp | hết hạn sau 15 phút | — |
| Allowlist đăng nhập | `fpt.edu.vn`, `fe.edu.vn` + access emails | BR-002 |

## Stack

| Layer | Công nghệ |
| --- | --- |
| API | Express 5, TypeScript, Zod, Mongoose |
| Web | Next.js 16, React 19, Tailwind CSS 4 |
| Mobile | Expo 54, React Native 0.81, Expo Router |
| Database | MongoDB Atlas + Atlas Vector Search |
| Storage | Amazon S3 |
| Auth | Amazon Cognito + Amplify clients |
| Email | Amazon SES |
| AI | Vertex AI Gemini, `gemini-embedding-001` |
| Infrastructure | AWS CDK |

## Collections Chính

| Collection | Mục đích |
| --- | --- |
| `users` | Local profile, role, academic profile, storage quota |
| `curriculums`, `subjects`, `semesters`, `curriculumsemesters`, `courseslots` | Catalog học vụ |
| `folders` | Cây thư mục cá nhân |
| `documents` | Metadata tài liệu, `visibility`, `courseSlotId`, trạng thái xử lý |
| `document_chunks` | Text chunks + embedding 1024 chiều |
| `shares` | Quyền read-only trực tiếp cho folder/document |
| `chat_sessions`, `chat_messages` | Lịch sử RAG chat |
| `access_emails` | Exception email ngoài domain allowlist |

## Tài Liệu Liên Quan

- [docs/SRS.md](./docs/SRS.md) — đặc tả nghiệp vụ (FR/BR/NFR), nguồn sự thật nghiệp vụ
- [README.md](./README.md)
- [docs/api_reference.md](./docs/api_reference.md)
- [docs/system_overview.md](./docs/system_overview.md)
- [docs/database_design.md](./docs/database_design.md)
- [docs/post_deploy_setup.md](./docs/post_deploy_setup.md)
