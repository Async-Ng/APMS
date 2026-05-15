# Tổng quan Hệ thống APMS (Academic Personal Management System)

Tài liệu này mô tả chi tiết về các nghiệp vụ cốt lõi, công nghệ sử dụng và các ràng buộc kỹ thuật của hệ thống APMS, được trích xuất từ tài liệu Đặc tả Yêu cầu Phần mềm (SRS) v1.0.

## 1. Nghiệp vụ cốt lõi (Business Logic)

Hệ thống APMS giải quyết bài toán quản lý kho tri thức cá nhân của sinh viên thông qua các nghiệp vụ chính:

### 1.1 Quản lý tài liệu (Document Management)
- **Tải lên & Lưu trữ:** Người dùng có thể tải lên tài liệu định dạng PDF, DOCX, PPTX.
- **Trích xuất văn bản (OCR/Parsing):** Hệ thống tự động đọc và trích xuất nội dung văn bản từ các file được tải lên để phục vụ tìm kiếm.
- **Phân loại:** Tài liệu có thể được gắn thẻ, đưa vào các Thư mục, Môn học, hoặc Học kỳ.
- **Xem trước (Preview):** Cung cấp trình xem tài liệu trực tiếp trên web mà không cần tải về.

### 1.2 Tìm kiếm thông minh (Semantic Search)
- **Tìm kiếm theo ngữ nghĩa:** Thay vì chỉ khớp từ khóa (keyword matching), hệ thống hiểu ý nghĩa của câu truy vấn (thông qua Vector Embeddings) để trả về kết quả chính xác nhất.
- **Định vị kết quả:** Hiển thị tên tài liệu và các đoạn trích dẫn sát với ngữ cảnh tìm kiếm.

### 1.3 Trợ lý AI (RAG Chatbot - Retrieval-Augmented Generation)
- **Hỏi đáp theo ngữ cảnh:** Người dùng chat với AI. AI sẽ tìm các đoạn văn bản liên quan trong tài liệu của người dùng làm "ngữ cảnh" để trả lời.
- **Trích dẫn minh bạch (Citations):** Mọi câu trả lời của AI đều chỉ ra nguồn gốc thông tin (từ file nào, trang số mấy/vị trí nào).
- **Quản lý phiên (Sessions):** Lưu lại lịch sử các đoạn chat theo từng phiên làm việc.

### 1.4 Quản lý tài khoản
- **Xác thực:** Đăng nhập một chạm qua Google OAuth 2.0.
- **Quản lý Quota:** Mỗi người dùng bị giới hạn dung lượng lưu trữ tối đa (ví dụ: 500MB).

### 1.5 Chia sẻ tài liệu (Document Sharing)
- **Chia sẻ file:** Người dùng có thể chia sẻ tài liệu của mình cho người dùng khác trong hệ thống.
- **Tương tác với tài liệu chia sẻ:** Người được chia sẻ có thể xem, tìm kiếm ngữ nghĩa và sử dụng RAG Chatbot trên tài liệu đó, giúp học nhóm và trao đổi kiến thức hiệu quả.
- **Quản lý quyền (Permissions):** Chủ sở hữu có thể thu hồi quyền truy cập bất cứ lúc nào. Người được chia sẻ chỉ có quyền đọc (Read-only), không được phép xóa tài liệu gốc.

---

## 2. Công nghệ sử dụng (Technology Stack)

Hệ thống sử dụng các công nghệ hiện đại nhằm đảm bảo hiệu năng và tính linh hoạt:

| Thành phần | Công nghệ |
| :--- | :--- |
| **Frontend (Web)** | React, TypeScript, Tailwind CSS (Sử dụng framework Next.js) |
| **Frontend (Mobile)** | React Native, Expo, TypeScript, NativeWind (Giao diện Mobile) |
| **Backend** | Node.js, Express.js |
| **Cơ sở dữ liệu** | MongoDB Atlas (Kích hoạt tính năng Vector Search) |
| **Dịch vụ AI** | Amazon Bedrock (Sử dụng Model **Claude 3 Haiku** cho LLM và **Titan Embeddings** cho Vector hóa văn bản) |
| **Lưu trữ File** | Amazon S3 (Lưu trữ file gốc an toàn, độ bền cao) |
| **Xử lý tài liệu** | Amazon Textract (dành cho PDF) hoặc các thư viện Parser NodeJS |
| **Cơ sở hạ tầng (IaC)** | AWS CDK (TypeScript), AWS CloudFormation, Cloud Hosting (Render, AWS) |

**Luồng dữ liệu (Data Flow):**
1. **Nạp dữ liệu:** Upload -> S3 -> Extract Text -> Chunking -> Titan Embedding -> MongoDB Vector Search.
2. **Truy vấn:** Prompt -> Titan Embedding -> MongoDB Vector Search -> Lấy Context -> Claude 3 Haiku -> Trả về câu trả lời kèm Trích dẫn.

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
- **Xác thực API:** Sử dụng **JWT (JSON Web Token)** để bảo mật các API endpoints.

### 3.3 Mở rộng (Scalability)
- **Stateless Backend:** Backend không lưu trạng thái (session lưu ở client/DB) để dễ dàng tự động mở rộng (Auto-scaling).
- **Cơ sở dữ liệu:** MongoDB Atlas Cloud hỗ trợ việc scale dung lượng và replica tự động.
