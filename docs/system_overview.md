# Tổng quan Hệ thống APMS (Academic Personal Management System)

Tài liệu này mô tả chi tiết về các nghiệp vụ cốt lõi, công nghệ sử dụng và các ràng buộc kỹ thuật của hệ thống APMS, được trích xuất từ tài liệu Đặc tả Yêu cầu Phần mềm (SRS) v1.0.

## 1. Nghiệp vụ cốt lõi (Business Logic)

Hệ thống APMS giải quyết bài toán quản lý kho tri thức cá nhân của sinh viên thông qua các nghiệp vụ chính:

### 1.1 Quản lý tài liệu (Document Management)
- **Tải lên & Lưu trữ:** Người dùng có thể tải lên tài liệu định dạng PDF, DOCX, PPTX.
- **Trích xuất văn bản (OCR/Parsing):** Hệ thống tự động đọc và trích xuất nội dung văn bản từ các file được tải lên để phục vụ tìm kiếm.
- **Tổ chức kiểu Google Drive:** Tài liệu được quản lý trong hệ thống thư mục lồng nhau (nested folders) không giới hạn cấp độ. Người dùng có thể tạo, di chuyển, đổi tên thư mục tự do.
- **Phân loại:** Tài liệu có thể được gắn thẻ (tags) và đặt trong thư mục để phân loại theo môn học, học kỳ.
- **Xem trước (Preview):** Cung cấp trình xem tài liệu trực tiếp trên web mà không cần tải về.

### 1.2 Tìm kiếm thông minh (Semantic Search)
- **Tìm kiếm theo ngữ nghĩa:** Thay vì chỉ khớp từ khóa (keyword matching), hệ thống hiểu ý nghĩa của câu truy vấn (thông qua Vector Embeddings) để trả về kết quả chính xác nhất.
- **Định vị kết quả:** Hiển thị tên tài liệu và các đoạn trích dẫn sát với ngữ cảnh tìm kiếm.

### 1.3 Trợ lý AI (RAG Chatbot - Retrieval-Augmented Generation)
- **Hỏi đáp theo ngữ cảnh:** Người dùng chat với AI. AI sẽ tìm các đoạn văn bản liên quan trong tài liệu của người dùng làm "ngữ cảnh" để trả lời.
- **Trích dẫn minh bạch (Citations):** Mọi câu trả lời của AI đều chỉ ra nguồn gốc thông tin (từ file nào, trang số mấy/vị trí nào).
- **Quản lý phiên (Sessions):** Lưu lại lịch sử các đoạn chat theo từng phiên làm việc.

### 1.4 Quản lý tài khoản
- **Xác thực:** Đăng nhập một chạm qua Google OAuth 2.0 (Amazon Cognito User Pool + Google federated IdP).
- **Quản lý Quota:** Mỗi người dùng bị giới hạn dung lượng lưu trữ tối đa (ví dụ: 500MB).

### 1.5 Chia sẻ tài liệu (Document Sharing)
- **Chia sẻ file và thư mục:** Người dùng có thể chia sẻ cả tài liệu đơn lẻ hoặc cả một thư mục (kèm toàn bộ nội dung bên trong) cho người dùng khác trong hệ thống.
- **Kế thừa quyền (Permission Inheritance):** Khi chia sẻ một thư mục, tất cả các file và thư mục con bên trong đều được kế thừa quyền truy cập (giống Google Drive).
- **Tương tác với tài liệu chia sẻ:** Người được chia sẻ có thể xem, tìm kiếm ngữ nghĩa và sử dụng RAG Chatbot trên tài liệu đó, giúp học nhóm và trao đổi kiến thức hiệu quả.
- **Quản lý quyền (Permissions):** Chủ sở hữu có thể thu hồi quyền truy cập bất cứ lúc nào. Người được chia sẻ chỉ có quyền đọc (Read-only), không được phép xóa hay chỉnh sửa tài liệu gốc.

### 1.6 Tổ chức & Quản lý (Organization)
- **Starred (Đã đánh dấu):** Người dùng có thể ghim (star) bất kỳ file hoặc thư mục nào để truy cập nhanh.
- **Trash (Thùng rác):** Xóa mềm (Soft Delete) — file/thư mục bị xóa sẽ vào Trash trước, người dùng có thể khôi phục hoặc xóa vĩnh viễn.

### 1.7 Quản trị hệ thống (Admin)
- **Xác thực:** Admin là user đăng nhập Google qua Cognito, được gán vào **User Pool group `admin`**. JWT ID token chứa claim `cognito:groups`; API đồng bộ `role: "admin"` vào MongoDB.
- **Quản lý người dùng:** Xem danh sách user, chỉnh `storageQuotaBytes`, vô hiệu hóa/kích hoạt tài khoản (`isDisabled`).
- **Thống kê:** Tổng users, storage, documents theo trạng thái, số folder.
- **Giới hạn:** Admin **không** truy cập/xóa tài liệu của user khác (cross-tenant moderation — phase sau). API admin: prefix `/api/admin`.

---

## 2. Công nghệ sử dụng (Technology Stack)

Hệ thống sử dụng các công nghệ hiện đại nhằm đảm bảo hiệu năng và tính linh hoạt:

| Thành phần | Công nghệ |
| :--- | :--- |
| **Frontend (Web)** | React, TypeScript, Tailwind CSS (Sử dụng framework Next.js) |
| **Frontend (Mobile)** | React Native, Expo, TypeScript, NativeWind (Giao diện Mobile) |
| **Backend** | Node.js, Express.js |
| **Cơ sở dữ liệu** | MongoDB Atlas (Kích hoạt tính năng Vector Search) |
| **Dịch vụ AI** | Google Gemini (`gemini-2.5-flash` cho LLM, `gemini-embedding-001` cho Vector hóa văn bản) |
| **Lưu trữ File** | Amazon S3 (Lưu trữ file gốc an toàn, độ bền cao) |
| **Xử lý tài liệu** | `pdf-parse` (PDF text-based), `mammoth` (DOCX) — thư viện Node.js local, không cần OCR cloud |
| **Cơ sở hạ tầng (IaC)** | AWS CDK (TypeScript), AWS CloudFormation, Cloud Hosting (Render, AWS) |

**Luồng dữ liệu (Data Flow):**
1. **Nạp dữ liệu:** Upload → S3 → Extract Text (pdf-parse / mammoth) → Chunking → Gemini Embedding → MongoDB Vector Search.
2. **Truy vấn:** Prompt → Gemini Embedding → MongoDB Vector Search → Lấy Context → Gemini (gemini-2.5-flash, fallback tự động) → Trả về câu trả lời kèm Trích dẫn.

---

## 3. Ràng buộc Hệ thống (System Constraints)

Hệ thống cần tuân thủ nghiêm ngặt các ràng buộc Phi chức năng (NFRs) sau:

### 3.1 Hiệu năng (Performance)
- **Truy vấn Vector:** Phải hoàn thành dưới **500ms**.
- **Thời gian phản hồi AI:** LLM Response time tối đa **3 giây** (Sử dụng Claude 3 Haiku là mô hình tối ưu về tốc độ).
- **Chịu tải:** Phục vụ đồng thời ít nhất **1.000 người dùng (Concurrent Users)**.

### 3.2 Bảo mật (Security)
- **Mã hóa:** Giao tiếp hoàn toàn qua **HTTPS/TLS**.
- **Cô lập dữ liệu (Multi-tenancy):** Dữ liệu của user nào chỉ được truy cập bởi user đó. Context nhồi vào AI tuyệt đối không bị lẫn lộn giữa các tài khoản.
- **Xác thực API:** Client gửi **Cognito ID token** (JWT); API xác minh chữ ký qua JWKS của User Pool.
- **Phân quyền Admin:** Claim `cognito:groups` (group `admin`) → `role` trong DB; route `/api/admin` qua middleware `requireAdmin`. Tài khoản `isDisabled` bị chặn API user (trừ `GET /auth/me`).

### 3.3 Mở rộng (Scalability)
- **Stateless Backend:** Backend không lưu trạng thái (session lưu ở client/DB) để dễ dàng tự động mở rộng (Auto-scaling).
- **Cơ sở dữ liệu:** MongoDB Atlas Cloud hỗ trợ việc scale dung lượng và replica tự động.

---

## 4. API đã triển khai (Implementation status)

Backend Express (`api/`) hiện hỗ trợ:

| Nhóm | Prefix | Trạng thái |
|------|--------|------------|
| Health | `/api/health` | Có |
| Auth / Profile | `/api/auth`, `/api/users` | Có (thêm `GET /api/users/search`) |
| Drive views | `/api/drive` | Có (root, starred, trash, **shared**) |
| Folders | `/api/folders` | Có (CRUD, star, soft delete, restore) |
| Documents | `/api/documents` | Có (presigned S3 upload, metadata) |
| Admin | `/api/admin` | Có (stats, user management) |
| Shares | `/api/shares` | **Có** (batch share, revoke, with-me, by-me) |
| Semantic search | — | Chưa |
| RAG Chat | — | Chưa |

Chi tiết endpoint, body, response: [`api_reference.md`](./api_reference.md).

---

## 5. Tài liệu liên quan

| Tài liệu | Mô tả |
| :--- | :--- |
| [`api_reference.md`](./api_reference.md) | Tham chiếu REST API đầy đủ (auth, drive, admin, upload) |
| [`database_design.md`](./database_design.md) | Schema chi tiết 7 Collections của MongoDB, chiến lược Index và Vector Search |
| [`post_deploy_setup.md`](./post_deploy_setup.md) | Hướng dẫn sau `cdk deploy`, OAuth, gán admin group |
| [`coding_standards.md`](./coding_standards.md) | Tiêu chuẩn lập trình TypeScript, Node.js, Next.js, React Native |
| [`ui_design_system.md`](./ui_design_system.md) | Hệ thống thiết kế UI (Claymorphism, bảng màu, typography) |
