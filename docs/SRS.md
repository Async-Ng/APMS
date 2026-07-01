# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
# APMS — Hệ thống Quản lý Học tập Cá nhân

| Trường | Nội dung |
|--------|----------|
| Phiên bản | 1.0.0 |
| Ngày | 2026-06-29 |
| Trạng thái | Draft — Tái tạo từ source code, chờ review |

> Tài liệu này được tái tạo từ source code fullstack (backend dịch vụ API + ứng dụng web + ứng dụng di động).
> Mọi mục đánh dấu **[CẦN XÁC NHẬN]** phải được Product Owner xác nhận trước khi dùng chính thức.

---

## MỤC LỤC
1. Introduction
2. Overall Description
3. Functional Requirements
4. Non-functional Requirements
5. External Interface Requirements
6. Data Requirements
7. Business Rules
8. Use Cases / User Stories
9. Error Handling
10. Security Requirements
11. Acceptance Criteria
12. Appendix

---

## 1. INTRODUCTION

### 1.1 Purpose

Tài liệu này xác định đầy đủ yêu cầu chức năng, phi chức năng, quy tắc nghiệp vụ và tiêu chí nghiệm thu của hệ thống **APMS — Hệ thống Quản lý Học tập Cá nhân**.

Mục tiêu:
- Giúp mọi thành viên trong nhóm hiểu hệ thống mà không cần đọc source code.
- Làm căn cứ để kiểm thử, bàn giao và mở rộng sản phẩm.
- Làm tài liệu giao tiếp giữa nhóm kỹ thuật và các bên liên quan.

Đối tượng đọc: Product Manager, Business Analyst, Developer, QA, các bên liên quan (giảng viên, quản trị viên nhà trường).

### 1.2 Scope

**Tên hệ thống:** APMS — Hệ thống Quản lý Học tập Cá nhân

**Mô tả ngắn:**
APMS là một ứng dụng (web và di động) giúp sinh viên gom toàn bộ tài liệu học tập của mình về một nơi duy nhất, sắp xếp theo chương trình đào tạo (ngành – học kỳ – môn học) và trò chuyện với một trợ lý AI dựa trên chính những tài liệu đó. Mỗi tài liệu bắt buộc gắn với một môn học trong chương trình đào tạo, có thể để ở chế độ riêng tư hoặc công khai, và có thể được tìm kiếm theo ngữ nghĩa. Sinh viên đăng nhập bằng tài khoản Google. Quản trị viên quản lý danh mục học thuật (ngành, học kỳ, môn học, chương trình đào tạo), người dùng và danh sách email được phép truy cập.

**Hệ thống bao gồm:**
- Đăng nhập và quản lý phiên làm việc bằng tài khoản Google.
- Quản lý hồ sơ cá nhân và hồ sơ học thuật (ngành, học kỳ, môn đang học).
- Quản lý tài liệu cá nhân (tải lên, xem, sửa, gắn sao, chuyển thùng rác, khôi phục, xóa vĩnh viễn).
- Sắp xếp tài liệu trong cây thư mục cá nhân.
- Chia sẻ tài liệu/thư mục cho người khác (chỉ đọc), kể cả mời qua email.
- Thư viện công khai: tìm và xem tài liệu được chia sẻ công khai.
- Tìm kiếm tài liệu theo ngữ nghĩa.
- Trò chuyện với trợ lý AI dựa trên tài liệu, kèm trích dẫn nguồn.
- Quản trị: thống kê, quản lý người dùng, quản lý email truy cập ngoại lệ, quản lý danh mục học thuật.

**Hệ thống không bao gồm:**
- Đăng ký tài khoản nội bộ bằng email/mật khẩu riêng (xác thực hoàn toàn qua nhà cung cấp Google/Cognito).
- Chỉnh sửa nội dung tệp tài liệu trực tiếp trên hệ thống (hệ thống chỉ lưu trữ và phân tích, không phải trình soạn thảo).
- Quyền cộng tác chỉnh sửa (chia sẻ chỉ ở mức chỉ đọc).
- Tính năng nhắn tin/bình luận/diễn đàn thảo luận giữa các sinh viên. Mục "Thư viện công khai" chỉ là nơi duyệt và xem tài liệu công khai (hai chế độ xem: "Diễn đàn" — gợi ý theo hồ sơ, và "Thư viện" — duyệt toàn bộ có bộ lọc), không có chức năng bình luận.
- Quản lý điểm/kết quả học tập và tích hợp với hệ thống quản lý đào tạo của trường (LMS/FAP). Đây là phạm vi ngoài sản phẩm.

### 1.3 Definitions

| Thuật ngữ | Định nghĩa |
|-----------|-----------|
| Người dùng | Sinh viên sử dụng hệ thống để quản lý tài liệu học tập của mình. |
| Quản trị viên | Người quản lý danh mục học thuật, người dùng và danh sách email truy cập. |
| Tài liệu | Một tệp học tập (PDF, DOCX, PPTX) do người dùng tải lên, gắn với một môn học. |
| Thư mục | Đơn vị sắp xếp tài liệu trong không gian cá nhân, có thể lồng nhau. |
| Curriculum | Chương trình đào tạo (track) mà người dùng theo học, ví dụ "SE-STD", "SE-FND". |
| Học kỳ | Một kỳ học trong chương trình đào tạo. |
| Môn học | Một môn trong chương trình đào tạo. |
| Course slot | Bản ghi học vụ 3 chiều gồm Curriculum – Học kỳ – Môn học; là điểm neo bắt buộc của tài liệu. |
| Hồ sơ học thuật | Lựa chọn của người dùng về curriculum, học kỳ hiện tại và các môn đang học. |
| Drive của tôi | Không gian tài liệu và thư mục cá nhân của người dùng. |
| Thư viện công khai | Nơi xem các tài liệu được đặt ở chế độ công khai. |
| Đã gắn sao | Nhóm tài liệu/thư mục được người dùng đánh dấu sao để truy cập nhanh. |
| Thùng rác | Nơi chứa tài liệu/thư mục đã xóa tạm thời, có thể khôi phục. |
| Trò chuyện AI | Phiên hỏi đáp với trợ lý AI dựa trên nội dung tài liệu. |
| Trích dẫn | Tham chiếu đến tài liệu nguồn đi kèm câu trả lời của trợ lý AI. |
| Riêng tư / Công khai | Hai chế độ hiển thị của tài liệu. |
| Email truy cập ngoại lệ | Email ngoài tên miền cho phép nhưng vẫn được duyệt vào hệ thống. |
| FR | Yêu cầu chức năng |
| NFR | Yêu cầu phi chức năng |
| BR | Quy tắc nghiệp vụ |
| UC | Tình huống sử dụng |
| AC | Tiêu chí nghiệm thu |

### 1.4 References

| # | Tài liệu |
|---|---------|
| 1 | Source code dịch vụ backend API — thư mục `api/` |
| 2 | Source code ứng dụng web — thư mục `web/` |
| 3 | Source code ứng dụng di động — thư mục `mobile/` |
| 4 | Tài liệu tổng quan sản phẩm — `PROJECT.md`, `docs/system_overview.md`, `docs/api_reference.md`, `docs/database_design.md` |
| 5 | IEEE Std 830-1998 |

---

## 2. OVERALL DESCRIPTION

### 2.1 Product Perspective

Hệ thống gồm các thành phần chính:
- **Ứng dụng web:** Giao diện chính cho người dùng và quản trị viên.
- **Ứng dụng di động:** Giao diện cho người dùng trên điện thoại với các tính năng cốt lõi (tài liệu, tìm kiếm, trò chuyện AI, hồ sơ).
- **Dịch vụ backend:** Xử lý nghiệp vụ, lưu trữ dữ liệu, phân quyền và cung cấp giao tiếp cho ứng dụng web/di động.

Hệ thống tích hợp với các dịch vụ bên ngoài:
- **Dịch vụ xác thực Google/Cognito:** Đăng nhập bằng tài khoản Google và quản lý danh tính.
- **Dịch vụ lưu trữ tệp đám mây (Amazon S3):** Lưu trữ tệp tài liệu của người dùng.
- **Dịch vụ trí tuệ nhân tạo (Vertex AI Gemini):** Tạo biểu diễn ngữ nghĩa của tài liệu, phục vụ tìm kiếm và trả lời câu hỏi có trích dẫn.
- **Dịch vụ gửi email (Amazon SES):** Gửi lời mời chia sẻ tài liệu qua email.

### 2.2 Product Functions

**Xác thực và phiên làm việc**
- Đăng nhập bằng tài khoản Google.
- Duy trì phiên làm việc và tự động đăng xuất khi phiên hết hạn.
- Đăng xuất.

**Hồ sơ cá nhân**
- Xem và cập nhật tên hiển thị.
- Thiết lập hồ sơ học thuật: chọn ngành, học kỳ hiện tại và các môn đang học.
- Xem trạng thái hoàn thành hồ sơ học thuật.

**Drive của tôi (tài liệu và thư mục cá nhân)**
- Tải tài liệu lên (gắn bắt buộc với một môn học).
- Xem danh sách tài liệu, nhóm theo môn học theo hồ sơ học thuật.
- Xem chi tiết và tải xuống tài liệu.
- Đổi tên, gắn thẻ, đổi thư mục, đổi môn học, đổi chế độ hiển thị của tài liệu.
- Tạo, đổi tên, di chuyển thư mục lồng nhau.
- Gắn sao / bỏ gắn sao tài liệu và thư mục.
- Chuyển tài liệu/thư mục vào thùng rác, khôi phục, xóa vĩnh viễn.

**Đã gắn sao**
- Xem các tài liệu và thư mục đã gắn sao.

**Đã chia sẻ**
- Chia sẻ tài liệu/thư mục (chỉ đọc) cho người dùng khác trong hệ thống hoặc mời qua email.
- Xem các mục được chia sẻ với tôi và các mục tôi đã chia sẻ.
- Thu hồi quyền chia sẻ.
- Chấp nhận lời mời chia sẻ qua liên kết.

**Thư viện công khai**
- Tìm và xem các tài liệu được đặt ở chế độ công khai, lọc theo ngành/học kỳ/môn học.

**Tìm kiếm**
- Tìm kiếm tài liệu theo ngữ nghĩa trong phạm vi tài liệu người dùng được phép xem.

**Trò chuyện AI**
- Tạo và quản lý các phiên trò chuyện (đổi tên, ghim, xóa).
- Đặt câu hỏi và nhận câu trả lời ngắn gọn theo kiểu hội thoại kèm trích dẫn từ tài liệu, sau đó có thể hỏi tiếp để khai thác sâu hơn.
- Chọn ngữ cảnh trò chuyện: toàn bộ tài liệu, một thư mục, một hoặc nhiều tài liệu.
- Các chế độ hỗ trợ: hỏi đáp, tóm tắt, câu hỏi thường gặp, hướng dẫn ôn tập.

**Quản trị**
- Xem thống kê tổng quan.
- Quản lý người dùng (xem, đổi hạn mức lưu trữ, đổi vai trò, vô hiệu hóa).
- Quản lý email truy cập ngoại lệ.
- Quản lý danh mục học thuật: ngành, học kỳ, môn học, gán học kỳ cho ngành, và chương trình đào tạo.

### 2.3 User Classes

#### Người dùng (Sinh viên)
- **Mô tả:** Sinh viên có tài khoản Google thuộc tên miền được phép (hoặc email được duyệt ngoại lệ).
- **Mục đích sử dụng chính:** Quản lý tài liệu học tập theo chương trình đào tạo và hỏi đáp với trợ lý AI.
- **Tần suất:** Hằng ngày hoặc theo nhu cầu học tập.
- **Màn hình chính:** Drive của tôi, Hồ sơ, Trò chuyện AI, Thư viện công khai.

#### Quản trị viên
- **Mô tả:** Người được cấp vai trò quản trị, quản lý dữ liệu nền và người dùng.
- **Mục đích sử dụng chính:** Thiết lập và duy trì danh mục học thuật, quản lý người dùng và email truy cập.
- **Tần suất:** Định kỳ, đặc biệt vào đầu kỳ học hoặc khi cập nhật chương trình đào tạo.
- **Màn hình chính:** Quản trị (Tổng quan, Quản lý người dùng, Email truy cập ngoại lệ, Danh mục học thuật).

### 2.4 Operating Environment

- **Nền tảng được hỗ trợ chính thức:** Ứng dụng web đáp ứng (responsive) trên trình duyệt hiện đại — máy tính (Chrome, Edge, Firefox, Safari, hai phiên bản mới nhất) và trình duyệt di động (Chrome Android, Safari iOS).
- Mã nguồn có sẵn ứng dụng di động native (Expo) cho các tính năng cốt lõi, nhưng bề mặt được cam kết hỗ trợ trong phạm vi tài liệu này là web đáp ứng.
- Dữ liệu và tệp được lưu trữ tập trung trên hạ tầng đám mây.
- Hệ thống yêu cầu kết nối internet để hoạt động.
- Đây là sản phẩm trong khuôn khổ đồ án môn học, không cam kết SLA vận hành chính thức.

### 2.5 Constraints

**Ràng buộc nghiệp vụ:**
- Mỗi tài liệu tải lên bắt buộc gắn với một môn học trong chương trình đào tạo.
- Người dùng chỉ được gắn tài liệu vào môn học thuộc đúng ngành và học kỳ đã chọn trong hồ sơ học thuật của mình.
- Chỉ định dạng PDF, DOCX và PPTX được chấp nhận.
- Tài liệu mặc định ở chế độ riêng tư khi tải lên.
- Quyền chia sẻ chỉ ở mức chỉ đọc.
- Một môn học/học kỳ/ngành đang được sử dụng (bởi người dùng hoặc tài liệu) không thể bị vô hiệu hóa.

**Ràng buộc kỹ thuật vận hành:**
- Mỗi người dùng có hạn mức lưu trữ mặc định 500 MB.
- Mỗi tệp tải lên không vượt quá 50 MB.
- Mỗi người dùng giới hạn 50 lượt hỏi trợ lý AI mỗi ngày.
- Tài liệu trong thùng rác tự động bị xóa vĩnh viễn sau 30 ngày.
- Liên kết tải tệp do hệ thống cấp có thời hạn 15 phút.
- Lời mời chia sẻ qua email có thời hạn 7 ngày.
- Tài liệu đặt công khai phải đã gắn với một môn học.
- Chỉ chấp nhận email thuộc tên miền cho phép (mặc định: `fpt.edu.vn`, `fe.edu.vn`) hoặc email được duyệt ngoại lệ.

**Ràng buộc pháp lý:**
- Sản phẩm trong khuôn khổ đồ án; chính sách bảo vệ dữ liệu người dùng (đặc biệt với tài liệu công khai) áp dụng theo điều khoản của các dịch vụ đám mây tích hợp.

### 2.6 Assumptions

- Người dùng có tài khoản Google hợp lệ thuộc tên miền được phép, hoặc được quản trị viên thêm vào danh sách email truy cập ngoại lệ.
- Danh mục học thuật (ngành, học kỳ, môn học, chương trình đào tạo) được quản trị viên thiết lập trước khi sinh viên sử dụng.
- Người dùng có thiết bị và kết nối internet ổn định.
- [CẦN XÁC NHẬN] Quy trình đào tạo/onboarding cho người dùng và quản trị viên mới.

---

## 3. FUNCTIONAL REQUIREMENTS

### 3.1 Xác thực và phiên làm việc

| ID | Yêu cầu chức năng |
|----|------------------|
| FR-001 | Hệ thống phải cho phép người dùng đăng nhập bằng tài khoản Google. |
| FR-002 | Hệ thống phải chỉ cho phép truy cập với email thuộc tên miền được phép hoặc email đã được duyệt trong danh sách truy cập ngoại lệ; các email khác bị từ chối. |
| FR-003 | Hệ thống phải tự động tạo hoặc đồng bộ hồ sơ người dùng nội bộ ở lần đăng nhập đầu tiên dựa trên thông tin tài khoản Google. |
| FR-004 | Hệ thống phải duy trì phiên làm việc của người dùng và tự động chuyển về màn hình đăng nhập khi phiên hết hạn. |
| FR-005 | Hệ thống phải cho phép người dùng đăng xuất, kết thúc phiên và xóa dữ liệu phiên trên thiết bị. |
| FR-006 | Hệ thống phải từ chối mọi truy cập tính năng nghiệp vụ của người dùng đã bị vô hiệu hóa. |

**Chi tiết FR-001 — Đăng nhập bằng Google:**

| Thuộc tính | Nội dung |
|------------|---------|
| Actor | Người dùng, Quản trị viên |
| Màn hình | Trang đăng nhập |
| Điều kiện thực hiện | Người dùng chưa đăng nhập. |
| Người dùng thực hiện | Nhấn nút đăng nhập bằng Google và hoàn tất xác thực với Google. |
| Dữ liệu cần nhập | Tài khoản Google (qua cửa sổ đăng nhập của Google). |
| Kết quả thành công | Hệ thống ghi nhận phiên, đồng bộ hồ sơ và chuyển người dùng vào "Drive của tôi". |
| Ngoại lệ | Nếu email không được phép, hệ thống từ chối với thông báo không có quyền truy cập; nếu kiểm tra quyền truy cập gặp sự cố, hệ thống báo lỗi tạm thời và yêu cầu thử lại. |

### 3.2 Hồ sơ cá nhân và hồ sơ học thuật

| ID | Yêu cầu chức năng |
|----|------------------|
| FR-007 | Hệ thống phải hiển thị email và tên hiển thị của người dùng. |
| FR-008 | Hệ thống phải cho phép người dùng cập nhật tên hiển thị (tối đa 100 ký tự, không để trống). |
| FR-009 | Hệ thống phải cho phép người dùng chọn curriculum, học kỳ hiện tại và các môn đang học để tạo hồ sơ học thuật. |
| FR-010 | Hệ thống phải chỉ cho phép chọn học kỳ thuộc curriculum đã chọn và môn học thuộc đúng cặp curriculum – học kỳ trong danh mục course slot. |
| FR-011 | Hệ thống phải yêu cầu chọn ít nhất một môn học khi lưu hồ sơ học thuật. |
| FR-012 | Hệ thống phải hiển thị trạng thái hồ sơ học thuật là "Đã hoàn thành" hoặc "Chưa hoàn thành". |
| FR-063 | Hệ thống phải cho phép người dùng chọn học kỳ **hiển thị** trên Drive (độc lập học kỳ chính trong hồ sơ); chỉ ảnh hưởng bố cục xem tài liệu, không đổi quyền upload hay gợi ý Thư viện. |
| FR-064 | Hệ thống phải cung cấp lối tắt **đổi học kỳ chính** từ Drive: một thao tác đặt học kỳ mới và mặc định chọn tất cả môn trong CTĐT của học kỳ đó (người dùng có thể chỉnh trong Hồ sơ sau). |

**Chi tiết FR-009 — Thiết lập hồ sơ học thuật:**

| Thuộc tính | Nội dung |
|------------|---------|
| Actor | Người dùng |
| Màn hình | Hồ sơ của tôi |
| Điều kiện thực hiện | Đã đăng nhập; danh mục học thuật đã được thiết lập. |
| Người dùng thực hiện | Chọn Curriculum → chọn Học kỳ → điều chỉnh danh sách Môn đang học (mặc định đã chọn tất cả môn trong course slots của học kỳ) → nhấn "Lưu hồ sơ". |
| Dữ liệu cần nhập | Curriculum, Học kỳ, danh sách Môn đang học. |
| Hành vi mặc định | Khi chọn hoặc đổi Học kỳ, giao diện mặc định chọn tất cả môn trong chương trình đào tạo của học kỳ đó (tối đa 30); người dùng có thể bỏ chọn trước khi lưu. |
| Kết quả thành công | Hệ thống lưu hồ sơ và hiển thị thông báo "Đã lưu hồ sơ học thuật"; trạng thái chuyển sang "Đã hoàn thành". |
| Ngoại lệ | Nếu chưa chọn ngành/học kỳ hoặc chưa chọn môn nào, hệ thống hiển thị thông báo yêu cầu bổ sung và không lưu. |

### 3.3 Quản lý tài liệu (Drive của tôi)

| ID | Yêu cầu chức năng |
|----|------------------|
| FR-013 | Hệ thống phải cho phép người dùng tải lên tài liệu định dạng PDF, DOCX hoặc PPTX, gắn bắt buộc với một môn học. |
| FR-014 | Hệ thống phải từ chối tải lên nếu định dạng tệp không được hỗ trợ hoặc dung lượng vượt quá giới hạn cho phép/hạn mức còn lại. |
| FR-015 | Hệ thống phải xử lý tài liệu sau khi tải lên (trích xuất nội dung, phân tích) và phản ánh trạng thái xử lý: đang chờ, đang xử lý, sẵn sàng, hoặc thất bại. |
| FR-016 | Hệ thống phải hiển thị danh sách tài liệu của người dùng, nhóm theo môn học dựa trên hồ sơ học thuật khi hồ sơ đã hoàn thành. |
| FR-017 | Hệ thống phải cho phép người dùng xem chi tiết và tải xuống tài liệu của mình hoặc tài liệu được phép xem. |
| FR-018 | Hệ thống phải cho phép người dùng cập nhật tiêu đề, thẻ, thư mục, môn học và chế độ hiển thị của tài liệu. |
| FR-019 | Hệ thống phải yêu cầu tài liệu đã gắn với một môn học trước khi cho phép đặt chế độ công khai. |
| FR-020 | Hệ thống phải cho phép người dùng gắn sao và bỏ gắn sao tài liệu. |
| FR-021 | Hệ thống phải cho phép người dùng chuyển tài liệu vào thùng rác, khôi phục, và xóa vĩnh viễn. |
| FR-022 | Hệ thống phải hoàn trả phần dung lượng đã dùng khi tài liệu bị xóa vĩnh viễn. |
| FR-023 | Hệ thống phải yêu cầu khôi phục thư mục cha trước khi khôi phục tài liệu nằm trong thư mục đã bị xóa. |
| FR-061 | Hệ thống phải tự động xóa vĩnh viễn tài liệu/thư mục đã ở trong thùng rác quá 30 ngày. |

**Chi tiết FR-013 — Tải tài liệu lên:**

| Thuộc tính | Nội dung |
|------------|---------|
| Actor | Người dùng |
| Màn hình | Drive của tôi (cửa sổ Tải lên) |
| Điều kiện thực hiện | Đã đăng nhập; còn hạn mức lưu trữ; có môn học hợp lệ để gắn. |
| Người dùng thực hiện | Chọn tệp, chọn môn học, (tùy chọn) đặt tiêu đề/thư mục/chế độ hiển thị, xác nhận tải lên. |
| Dữ liệu cần nhập | Tệp tài liệu, môn học (bắt buộc), tiêu đề (tùy chọn), chế độ hiển thị (mặc định: riêng tư). |
| Kết quả thành công | Tệp được lưu, tài liệu được tạo và đưa vào hàng xử lý; danh sách tài liệu cập nhật. |
| Ngoại lệ | Định dạng không hỗ trợ, vượt hạn mức, môn học không thuộc hồ sơ học thuật → hệ thống từ chối và thông báo lý do. |

### 3.4 Thư mục cá nhân

| ID | Yêu cầu chức năng |
|----|------------------|
| FR-024 | Hệ thống phải cho phép người dùng tạo thư mục, đặt tên và màu, có thể lồng trong thư mục khác. |
| FR-025 | Hệ thống phải cho phép người dùng đổi tên, đổi vị trí (thư mục cha) và xóa thư mục. |
| FR-026 | Hệ thống phải cho phép người dùng gắn sao và bỏ gắn sao thư mục. |
| FR-027 | Hệ thống phải cho phép chuyển thư mục vào thùng rác, khôi phục và xóa vĩnh viễn. |

### 3.5 Chia sẻ

| ID | Yêu cầu chức năng |
|----|------------------|
| FR-028 | Hệ thống phải cho phép chủ sở hữu chia sẻ tài liệu hoặc thư mục ở mức chỉ đọc cho một hoặc nhiều người dùng (tối đa 50 mỗi lần). |
| FR-029 | Hệ thống phải cho phép chia sẻ qua email; nếu người nhận chưa có tài khoản, hệ thống gửi lời mời qua email kèm liên kết. |
| FR-030 | Hệ thống phải cho phép tìm người nhận theo email hoặc tên hiển thị. |
| FR-031 | Hệ thống phải hiển thị danh sách các mục "được chia sẻ với tôi" và "tôi đã chia sẻ". |
| FR-032 | Hệ thống phải cho phép chủ sở hữu thu hồi quyền chia sẻ. |
| FR-033 | Hệ thống phải cho phép người được mời xem trước và chấp nhận lời mời chia sẻ qua liên kết; lời mời có thời hạn 7 ngày. |
| FR-034 | Hệ thống phải ngăn tạo bản ghi chia sẻ trùng lặp cho cùng một mục và cùng một người nhận. |

### 3.6 Thư viện công khai

| ID | Yêu cầu chức năng |
|----|------------------|
| FR-035 | Hệ thống phải cho phép người dùng xem danh sách tài liệu công khai. |
| FR-036 | Hệ thống phải cho phép lọc tài liệu công khai theo ngành, học kỳ và môn học. |
| FR-037 | Hệ thống phải cho phép người dùng xem chi tiết tài liệu công khai. |

### 3.7 Tìm kiếm

| ID | Yêu cầu chức năng |
|----|------------------|
| FR-038 | Hệ thống phải cho phép người dùng tìm kiếm tài liệu theo ngữ nghĩa bằng câu/cụm từ. |
| FR-039 | Hệ thống phải chỉ trả về kết quả trong phạm vi tài liệu mà người dùng được phép xem (của mình, được chia sẻ, hoặc công khai). |

### 3.8 Trò chuyện AI

| ID | Yêu cầu chức năng |
|----|------------------|
| FR-040 | Hệ thống phải cho phép người dùng tạo phiên trò chuyện với ngữ cảnh: toàn bộ tài liệu, một thư mục, một tài liệu, hoặc nhiều tài liệu. |
| FR-041 | Hệ thống phải cho phép người dùng gửi câu hỏi và nhận câu trả lời từ trợ lý AI dựa trên tài liệu trong ngữ cảnh; các câu trả lời ưu tiên ngắn gọn, tự nhiên như hội thoại và kèm gợi ý câu hỏi tiếp theo ở chế độ hỏi đáp. |
| FR-042 | Hệ thống phải đính kèm trích dẫn nguồn (tài liệu, trang, đoạn) vào câu trả lời. |
| FR-043 | Hệ thống phải hỗ trợ các chế độ: hỏi đáp, tóm tắt, câu hỏi thường gặp, hướng dẫn ôn tập. |
| FR-044 | Hệ thống phải cho phép người dùng xem danh sách phiên, đổi tên, ghim/bỏ ghim và xóa phiên trò chuyện. Phiên có ngữ cảnh tài liệu hoặc thư mục đã xóa (thùng rác) hoặc không còn tồn tại không hiển thị trong danh sách. |
| FR-045 | Hệ thống phải hỗ trợ trả lời theo luồng (hiển thị dần) cho trải nghiệm trò chuyện. |
| FR-062 | Hệ thống phải giới hạn mỗi người dùng tối đa 50 lượt hỏi trợ lý AI mỗi ngày và từ chối khi vượt giới hạn. |

### 3.9 Quản trị — Người dùng và Email truy cập

| ID | Yêu cầu chức năng |
|----|------------------|
| FR-046 | Hệ thống phải cho phép quản trị viên xem thống kê tổng quan của hệ thống. |
| FR-047 | Hệ thống phải cho phép quản trị viên xem và tìm kiếm danh sách người dùng (có phân trang). |
| FR-048 | Hệ thống phải cho phép quản trị viên cập nhật hạn mức lưu trữ, vai trò và trạng thái vô hiệu hóa của người dùng. |
| FR-049 | Hệ thống phải cho phép quản trị viên xem, tìm kiếm và lọc danh sách email truy cập ngoại lệ theo trạng thái. |
| FR-050 | Hệ thống phải cho phép quản trị viên thêm nhiều email truy cập ngoại lệ cùng lúc (tối đa 500 mỗi lần). |
| FR-051 | Hệ thống phải cho phép quản trị viên cập nhật ghi chú và trạng thái kích hoạt của email truy cập, và vô hiệu hóa email. |

### 3.10 Quản trị — Danh mục học thuật

| ID | Yêu cầu chức năng |
|----|------------------|
| FR-052 | Hệ thống phải cho phép quản trị viên tạo, xem, cập nhật và lưu trữ (vô hiệu hóa) Curriculum. |
| FR-053 | Hệ thống phải cho phép quản trị viên tạo, xem, cập nhật và lưu trữ Học kỳ, kèm thứ tự sắp xếp. |
| FR-054 | Hệ thống phải cho phép quản trị viên tạo, xem, cập nhật và lưu trữ Môn học. |
| FR-055 | Hệ thống phải bảo đảm mã Curriculum, mã Học kỳ và mã Môn học là duy nhất (không phân biệt hoa thường, tự chuẩn hóa in hoa). |
| FR-056 | Hệ thống phải cho phép quản trị viên gán một hoặc nhiều Học kỳ cho một Curriculum và gỡ (lưu trữ) liên kết đó. |
| FR-057 | Hệ thống phải cho phép quản trị viên tạo, xem (có lọc), cập nhật và lưu trữ mục Course slot (gồm Curriculum – Học kỳ – Môn học). |
| FR-058 | Hệ thống phải chỉ cho phép tạo mục Course slot khi Curriculum, Học kỳ, Môn học đều đang hoạt động và cặp Curriculum – Học kỳ đã được gán với nhau. |
| FR-059 | Hệ thống phải bảo đảm mỗi mục Course slot (Curriculum – Học kỳ – Môn học) là duy nhất, không trùng lặp. |
| FR-060 | Hệ thống phải ngăn việc thay đổi định danh của mục Course slot khi đã có tài liệu tham chiếu đến nó. |

**Chi tiết FR-057 — Quản lý Course slot:**

| Thuộc tính | Nội dung |
|------------|---------|
| Actor | Quản trị viên |
| Màn hình | Quản trị → Danh mục học thuật |
| Điều kiện thực hiện | Đã đăng nhập với vai trò quản trị; đã có Curriculum, Học kỳ, Môn học hoạt động và cặp Curriculum – Học kỳ đã được gán. |
| Người dùng thực hiện | Chọn Curriculum, Học kỳ, Môn học để tạo mục mới; hoặc cập nhật/lưu trữ mục hiện có. |
| Dữ liệu cần nhập | Curriculum, Học kỳ, Môn học. |
| Kết quả thành công | Mục Course slot được tạo/cập nhật và xuất hiện trong danh mục. |
| Ngoại lệ | Trùng lặp, thành phần không hoạt động, cặp Curriculum–Học kỳ chưa gán, hoặc đổi định danh khi đã có tài liệu tham chiếu → hệ thống từ chối và nêu lý do. |

---

## 4. NON-FUNCTIONAL REQUIREMENTS

### 4.1 Performance

| ID | Yêu cầu |
|----|---------|
| NFR-P01 | Danh sách tài liệu, người dùng và email truy cập phải hỗ trợ phân trang (mặc định 20 mục, tối đa 100 mục mỗi trang). |
| NFR-P02 | Mỗi tệp tải lên không vượt quá 50 MB; mỗi người dùng có hạn mức lưu trữ mặc định 500 MB. |
| NFR-P03 | Hệ thống phải xử lý tài liệu (trích xuất, phân tích) ở chế độ nền, không chặn thao tác của người dùng. |
| NFR-P04 | Trò chuyện AI phải hỗ trợ trả lời theo luồng để giảm thời gian chờ cảm nhận. |
| NFR-P05 | Trong khuôn khổ đồ án, hệ thống hướng tới thời gian phản hồi tốt nhất có thể; không cam kết mục tiêu SLA cụ thể. |

### 4.2 Security

| ID | Yêu cầu |
|----|---------|
| NFR-S01 | Mọi trang và tính năng nghiệp vụ chỉ truy cập được khi người dùng đã đăng nhập. |
| NFR-S02 | Mỗi tính năng chỉ hiển thị và hoạt động đúng với vai trò được phép; tính năng quản trị chỉ dành cho quản trị viên. |
| NFR-S03 | Hệ thống chỉ cho phép truy cập với email thuộc tên miền được phép hoặc email được duyệt ngoại lệ. |
| NFR-S04 | Người dùng chỉ thao tác được trên tài liệu/thư mục của chính mình, trừ quyền chỉ đọc với mục được chia sẻ/công khai. |
| NFR-S05 | Dữ liệu truyền giữa thiết bị và máy chủ phải được mã hóa. |
| NFR-S06 | [CẦN XÁC NHẬN] Chính sách kiểm thử bảo mật định kỳ. |

### 4.3 Availability

| ID | Yêu cầu |
|----|---------|
| NFR-A01 | Hệ thống phải cung cấp điểm kiểm tra tình trạng vận hành phục vụ giám sát. |
| NFR-A02 | Khi gặp sự cố, hệ thống phải hiển thị thông báo phù hợp thay vì màn hình trắng hoặc lỗi kỹ thuật. |
| NFR-A03 | Trong khuôn khổ đồ án, hệ thống vận hành theo mức "tốt nhất có thể"; không cam kết mục tiêu uptime/SLA, kế hoạch bảo trì và sao lưu chính thức. |

### 4.4 Scalability

| ID | Yêu cầu |
|----|---------|
| NFR-SC01 | Việc xử lý tài liệu phải có cơ chế thử lại khi thất bại (tối đa một số lần nhất định). |
| NFR-SC02 | Thao tác làm tăng dung lượng lưu trữ phải được kiểm soát để không vượt hạn mức ngay cả khi có nhiều thao tác đồng thời. |
| NFR-SC03 | Việc xử lý tài liệu chạy nền theo cơ chế hàng đợi với mức xử lý đồng thời cấu hình được, cho phép mở rộng khi cần. |

### 4.5 Reliability

| ID | Yêu cầu |
|----|---------|
| NFR-R01 | Khi xảy ra lỗi, hệ thống phải hiển thị thông báo rõ ràng, không tiết lộ thông tin kỹ thuật nội bộ. |
| NFR-R02 | Mọi lỗi phải được ghi nhận đủ thông tin để xử lý sự cố. |
| NFR-R03 | Khi một thao tác làm tăng dung lượng vượt hạn mức, hệ thống phải hoàn tác phần đã ghi nhận để giữ toàn vẹn dữ liệu. |
| NFR-R04 | Việc xóa tài liệu phải qua bước thùng rác trước khi xóa vĩnh viễn, cho phép khôi phục. |

---

## 5. EXTERNAL INTERFACE REQUIREMENTS

### 5.1 User Interface

Hệ thống cung cấp ứng dụng web và ứng dụng di động. Cấu trúc điều hướng chính (web) gồm thanh bên với các mục:

- **Drive của tôi** → Quản lý tài liệu và thư mục cá nhân.
- **Đã gắn sao** → Tài liệu/thư mục đã đánh dấu sao.
- **Đã chia sẻ** → Mục được chia sẻ với tôi và tôi đã chia sẻ.
- **Thư viện công khai** → Xem tài liệu công khai.
- **Trò chuyện AI** → Hỏi đáp với trợ lý AI.
- **Thùng rác** → Mục đã xóa tạm thời.
- **Quản trị** (chỉ quản trị viên) → Thống kê, người dùng, email truy cập, danh mục học thuật.
- **Hồ sơ của tôi** → Thông tin cá nhân và hồ sơ học thuật.

**Nguyên tắc giao diện chung:**
- Người dùng phải đăng nhập trước khi truy cập bất kỳ tính năng nào.
- Nội dung và menu hiển thị phụ thuộc vai trò người dùng.
- Thao tác quan trọng (xóa, thu hồi chia sẻ) cần xác nhận.
- Hệ thống phải thông báo rõ kết quả mỗi thao tác (thành công hoặc lỗi).
- Thanh dung lượng hiển thị mức lưu trữ đã dùng so với hạn mức.

### 5.2 API Interface

- Giao tiếp theo kiến trúc REST, định dạng JSON.
- Mọi yêu cầu nghiệp vụ phải kèm thông tin xác thực hợp lệ (trừ một số bước công khai như xem trước lời mời chia sẻ).
- Phản hồi thành công và lỗi đều có cấu trúc nhất quán, kèm mã lỗi nghiệp vụ.
- Trò chuyện AI hỗ trợ trả lời theo luồng.

**Nhóm chức năng theo nghiệp vụ:**

| Nhóm | Mô tả |
|------|-------|
| Xác thực | Đăng nhập, lấy thông tin người dùng hiện tại |
| Hồ sơ & Danh mục | Hồ sơ học thuật, đọc danh mục ngành/học kỳ/môn/chương trình |
| Tài liệu | Tải lên, danh sách, chi tiết, cập nhật, xóa, khôi phục, gắn sao |
| Thư mục | Tạo, sửa, xóa, khôi phục, gắn sao |
| Chia sẻ & Lời mời | Chia sẻ chỉ đọc, xem/chấp nhận lời mời |
| Tìm kiếm | Tìm kiếm theo ngữ nghĩa |
| Trò chuyện AI | Phiên và tin nhắn trò chuyện |
| Quản trị | Thống kê, người dùng, email truy cập, danh mục học thuật |

### 5.3 Software Interfaces

| Dịch vụ / Hệ thống | Mục đích nghiệp vụ |
|--------------------|-------------------|
| Cơ sở dữ liệu trung tâm | Lưu trữ toàn bộ dữ liệu nghiệp vụ và biểu diễn ngữ nghĩa của tài liệu |
| Dịch vụ lưu trữ tệp đám mây | Lưu trữ tệp tài liệu của người dùng |
| Dịch vụ xác thực Google/Cognito | Đăng nhập và quản lý danh tính |
| Dịch vụ trí tuệ nhân tạo | Tạo biểu diễn ngữ nghĩa, tìm kiếm và trả lời câu hỏi có trích dẫn |
| Dịch vụ gửi email | Gửi lời mời chia sẻ tài liệu |

### 5.4 Hardware Interfaces

Không có yêu cầu phần cứng chuyên dụng. Người dùng truy cập qua thiết bị cá nhân có trình duyệt web hoặc ứng dụng di động và kết nối internet.
[CẦN XÁC NHẬN] Yêu cầu hạ tầng máy chủ triển khai.

---

## 6. DATA REQUIREMENTS

### 6.1 Database Schema (Mô hình dữ liệu nghiệp vụ)

#### Đối tượng: Người dùng
**Ý nghĩa:** Sinh viên hoặc quản trị viên trong hệ thống.

| Thuộc tính | Ý nghĩa nghiệp vụ | Bắt buộc | Ràng buộc |
|------------|------------------|----------|-----------|
| Email | Định danh đăng nhập | ✅ | Duy nhất |
| Tên hiển thị | Tên hiển thị của người dùng | ✅ | Tối đa 100 ký tự |
| Vai trò | Người dùng hoặc Quản trị viên | ✅ | Mặc định: Người dùng |
| Trạng thái hoạt động | Còn hoạt động hay đã bị vô hiệu hóa | ✅ | Mặc định: hoạt động |
| Curriculum | Curriculum đã chọn | ❌ | Tham chiếu Curriculum |
| Học kỳ hiện tại | Học kỳ đang theo học | ❌ | Tham chiếu Học kỳ |
| Môn đang học | Các môn đang theo học | ❌ | Tham chiếu Môn học |
| Dung lượng đã dùng / Hạn mức | Mức lưu trữ đã dùng so với hạn mức | ✅ | Hạn mức mặc định 500 MB |

#### Đối tượng: Tài liệu
**Ý nghĩa:** Một tệp học tập do người dùng tải lên.

| Thuộc tính | Ý nghĩa nghiệp vụ | Bắt buộc | Ràng buộc |
|------------|------------------|----------|-----------|
| Chủ sở hữu | Người tải lên | ✅ | Tham chiếu Người dùng |
| Tiêu đề | Tên tài liệu | ✅ | Tối đa 255 ký tự |
| Môn học | Môn trong chương trình đào tạo | ✅ (khi tải lên) | Tham chiếu Chương trình đào tạo |
| Chế độ hiển thị | Riêng tư hoặc Công khai | ✅ | Mặc định: Riêng tư |
| Thư mục | Thư mục chứa tài liệu | ❌ | Tham chiếu Thư mục |
| Định dạng tệp | PDF, DOCX, PPTX | ✅ | Chỉ định dạng được hỗ trợ |
| Dung lượng | Kích thước tệp | ✅ | Lớn hơn 0 |
| Trạng thái xử lý | Đang chờ / Đang xử lý / Sẵn sàng / Thất bại | ✅ | Mặc định: Đang chờ |
| Thẻ | Nhãn phân loại | ❌ | Tối đa 20 thẻ |
| Đã gắn sao | Đánh dấu sao | ❌ | Mặc định: không |
| Thời điểm xóa | Thời điểm chuyển vào thùng rác | ❌ | Trống nếu chưa xóa |

#### Đối tượng: Thư mục
**Ý nghĩa:** Đơn vị sắp xếp tài liệu cá nhân, có thể lồng nhau.

| Thuộc tính | Ý nghĩa nghiệp vụ | Bắt buộc | Ràng buộc |
|------------|------------------|----------|-----------|
| Chủ sở hữu | Người tạo | ✅ | Tham chiếu Người dùng |
| Tên | Tên thư mục | ✅ | Tối đa 255 ký tự |
| Thư mục cha | Thư mục chứa nó | ❌ | Tham chiếu Thư mục |
| Màu | Màu hiển thị | ❌ | Mặc định có sẵn |
| Đã gắn sao / Thời điểm xóa | Đánh dấu sao / trạng thái thùng rác | ❌ | — |

#### Đối tượng: Curriculum
| Thuộc tính | Ý nghĩa | Bắt buộc | Ràng buộc |
|------------|---------|----------|-----------|
| Mã curriculum | Mã định danh | ✅ | Duy nhất, in hoa, tối đa 20 ký tự |
| Tên curriculum | Tên đầy đủ | ✅ | Tối đa 150 ký tự |
| Mô tả | Mô tả curriculum | ❌ | Tối đa 1000 ký tự |
| Trạng thái hoạt động | Còn dùng hay đã lưu trữ | ✅ | Mặc định: hoạt động |

#### Đối tượng: Học kỳ
| Thuộc tính | Ý nghĩa | Bắt buộc | Ràng buộc |
|------------|---------|----------|-----------|
| Mã học kỳ | Mã định danh | ✅ | Duy nhất, in hoa, tối đa 30 ký tự |
| Tên học kỳ | Tên đầy đủ | ✅ | Tối đa 150 ký tự |
| Thứ tự sắp xếp | Vị trí hiển thị | ✅ | Số ≥ 0 |
| Trạng thái hoạt động | Còn dùng hay đã lưu trữ | ✅ | Mặc định: hoạt động |

#### Đối tượng: Môn học
| Thuộc tính | Ý nghĩa | Bắt buộc | Ràng buộc |
|------------|---------|----------|-----------|
| Mã môn | Mã định danh | ✅ | Duy nhất, in hoa, tối đa 30 ký tự |
| Tên môn | Tên đầy đủ | ✅ | Tối đa 200 ký tự |
| Mô tả | Mô tả môn | ❌ | Tối đa 1000 ký tự |
| Trạng thái hoạt động | Còn dùng hay đã lưu trữ | ✅ | Mặc định: hoạt động |

#### Đối tượng: Gán Học kỳ cho Curriculum
**Ý nghĩa:** Xác định những học kỳ nào thuộc về một curriculum.

| Thuộc tính | Ý nghĩa | Bắt buộc | Ràng buộc |
|------------|---------|----------|-----------|
| Curriculum | Curriculum liên quan | ✅ | Tham chiếu Curriculum |
| Học kỳ | Học kỳ được gán | ✅ | Tham chiếu Học kỳ |
| Trạng thái hoạt động | Còn hiệu lực hay đã gỡ | ✅ | Mỗi cặp Curriculum–Học kỳ là duy nhất |

#### Đối tượng: Course slot
**Ý nghĩa:** Một môn học thuộc một curriculum ở một học kỳ cụ thể; là điểm neo bắt buộc của mọi tài liệu.

| Thuộc tính | Ý nghĩa | Bắt buộc | Ràng buộc |
|------------|---------|----------|-----------|
| Curriculum | Curriculum | ✅ | Tham chiếu Curriculum |
| Học kỳ | Học kỳ | ✅ | Tham chiếu Học kỳ |
| Môn học | Môn học | ✅ | Tham chiếu Môn học |
| Trạng thái hoạt động | Còn dùng hay đã lưu trữ | ✅ | Bộ ba Curriculum–Học kỳ–Môn là duy nhất |

#### Đối tượng: Chia sẻ
| Thuộc tính | Ý nghĩa | Bắt buộc | Ràng buộc |
|------------|---------|----------|-----------|
| Loại đối tượng | Tài liệu hoặc Thư mục | ✅ | — |
| Đối tượng | Mục được chia sẻ | ✅ | — |
| Chủ sở hữu / Người nhận | Bên chia sẻ và bên được chia sẻ | ✅ | Không trùng lặp cùng mục–người nhận |
| Quyền | Mức quyền | ✅ | Chỉ đọc |

#### Đối tượng: Lời mời chia sẻ
| Thuộc tính | Ý nghĩa | Bắt buộc | Ràng buộc |
|------------|---------|----------|-----------|
| Email người nhận | Email được mời | ✅ | — |
| Trạng thái | Đang chờ / Đã chấp nhận / Đã thu hồi | ✅ | Mặc định: Đang chờ |
| Thời hạn | Hạn dùng lời mời | ✅ | 7 ngày kể từ khi tạo |

#### Đối tượng: Phiên trò chuyện & Tin nhắn
| Thuộc tính | Ý nghĩa | Bắt buộc | Ràng buộc |
|------------|---------|----------|-----------|
| Chủ sở hữu | Người dùng sở hữu phiên | ✅ | Tham chiếu Người dùng |
| Tiêu đề | Tên phiên | ✅ | Tối đa 255 ký tự |
| Ngữ cảnh | Toàn bộ / Thư mục / Một tài liệu / Nhiều tài liệu | ✅ | — |
| Ghim | Đánh dấu ghim | ❌ | — |
| Vai trò tin nhắn | Người dùng hoặc Trợ lý | ✅ | — |
| Nội dung & Trích dẫn | Nội dung tin nhắn và nguồn tham chiếu | ✅ (nội dung) | — |
| Gợi ý câu hỏi tiếp theo | Các câu hỏi follow-up do trợ lý đề xuất sau câu trả lời ở chế độ hỏi đáp | ❌ | Tối đa 3 câu |

#### Đối tượng: Email truy cập ngoại lệ
| Thuộc tính | Ý nghĩa | Bắt buộc | Ràng buộc |
|------------|---------|----------|-----------|
| Email | Email được duyệt ngoài tên miền | ✅ | Duy nhất |
| Ghi chú | Lý do/ghi chú | ❌ | Tối đa 500 ký tự |
| Trạng thái hoạt động | Đang hiệu lực hay đã vô hiệu | ✅ | Mặc định: hoạt động |

### 6.2 ERD — Quan hệ giữa các đối tượng

```
Người dùng ───── (chọn) ─────── 1 Curriculum
Người dùng ───── (chọn) ─────── 1 Học kỳ
Người dùng ───── (đang học) ─── N Môn học
Người dùng ───── (sở hữu) ───── N Tài liệu
Người dùng ───── (sở hữu) ───── N Thư mục
Người dùng ───── (sở hữu) ───── N Phiên trò chuyện

Curriculum ──── (có) ───────── N Gán Học kỳ cho Curriculum ── 1 Học kỳ
Curriculum + Học kỳ + Môn học ── (tạo thành) ── 1 Course slot

Course slot ─────────── (được gắn bởi) ── N Tài liệu
Thư mục ──────── (chứa) ─────── N Tài liệu
Thư mục ──────── (chứa) ─────── N Thư mục con

Tài liệu/Thư mục ── (được chia sẻ qua) ── N Chia sẻ ── 1 Người nhận
Tài liệu/Thư mục ── (được mời qua) ────── N Lời mời chia sẻ

Phiên trò chuyện ── (gồm) ── N Tin nhắn ── (kèm) ── N Trích dẫn → Tài liệu
```

**Đọc sơ đồ:** `1` — Một; `N` — Nhiều.

### 6.3 Vòng đời các đối tượng chính

**Tài liệu (theo trạng thái xử lý):**
```
[Đang chờ] → [Đang xử lý] → [Sẵn sàng]
                   │
                   └────────→ [Thất bại] → (thử lại) → [Đang xử lý]
```
- Tài liệu vừa tạo ở trạng thái Đang chờ; sau khi tải tệp xong chuyển sang Đang xử lý.
- Khi phân tích xong chuyển sang Sẵn sàng; nếu lỗi chuyển sang Thất bại và có thể thử lại (giới hạn số lần).

**Tài liệu / Thư mục (theo vòng đời lưu trữ):**
```
[Đang hoạt động] ──(xóa)──> [Trong thùng rác] ──(khôi phục)──> [Đang hoạt động]
                                     │
                                     └──(xóa vĩnh viễn)──> [Đã xóa]
```
- Khôi phục tài liệu trong thư mục đã xóa yêu cầu khôi phục thư mục cha trước.

**Lời mời chia sẻ:**
```
[Đang chờ] ──(chấp nhận)──> [Đã chấp nhận]
[Đang chờ] ──(thu hồi)────> [Đã thu hồi]
[Đang chờ] ──(quá 7 ngày)─> (hết hạn)
```

**Danh mục học thuật (Curriculum/Học kỳ/Môn/Course slot):**
```
[Hoạt động] ──(lưu trữ)──> [Đã lưu trữ]
```
- Không thể lưu trữ khi vẫn còn người dùng hoặc tài liệu đang tham chiếu.

### 6.4 Data Validation Rules

| Màn hình / Đối tượng | Trường | Quy tắc |
|----------------------|--------|---------|
| Hồ sơ | Tên hiển thị | Bắt buộc, tối đa 100 ký tự |
| Hồ sơ học thuật | Curriculum, Học kỳ | Bắt buộc; học kỳ phải thuộc curriculum đã chọn |
| Hồ sơ học thuật | Môn đang học | Ít nhất 1, tối đa 30; phải thuộc đúng curriculum–học kỳ |
| Tải lên | Tệp | Định dạng PDF/DOCX/PPTX; trong giới hạn dung lượng và hạn mức |
| Tải lên | Môn học | Bắt buộc; phải thuộc hồ sơ học thuật của người dùng |
| Tài liệu | Tiêu đề | Tối đa 255 ký tự |
| Tài liệu | Thẻ | Tối đa 20 thẻ, mỗi thẻ tối đa 50 ký tự |
| Tài liệu | Chế độ công khai | Chỉ đặt được khi đã gắn môn học |
| Curriculum/Học kỳ/Môn | Mã | Bắt buộc, duy nhất, tự chuẩn hóa in hoa |
| Chia sẻ | Người nhận | Ít nhất 1; tối đa 50 người và 50 email mỗi lần |
| Trò chuyện | Nội dung câu hỏi | Bắt buộc khi ở chế độ hỏi đáp; tối đa 10.000 ký tự |
| Trò chuyện | Số lượt hỏi | Tối đa 50 lượt/người/ngày |
| Tải lên | Dung lượng tệp | Tối đa 50 MB mỗi tệp; trong hạn mức 500 MB của người dùng |
| Email truy cập | Danh sách thêm | 1–500 email mỗi lần |
| Đăng nhập | Email | Thuộc tên miền cho phép (mặc định fpt.edu.vn, fe.edu.vn) hoặc email ngoại lệ |

---

## 7. BUSINESS RULES

### 7.1 Truy cập và Phân quyền

| ID | Quy tắc | Hệ quả khi vi phạm |
|----|---------|-------------------|
| BR-001 | Người dùng chưa đăng nhập không được truy cập tính năng nghiệp vụ. | Chuyển về trang đăng nhập. |
| BR-002 | Chỉ email thuộc tên miền được phép hoặc email truy cập ngoại lệ mới được vào hệ thống. | Từ chối truy cập với thông báo không có quyền. |
| BR-003 | Tính năng quản trị chỉ dành cho quản trị viên. | Ẩn tính năng và từ chối truy cập. |
| BR-004 | Người dùng bị vô hiệu hóa không được sử dụng hệ thống. | Từ chối mọi thao tác. |
| BR-005 | Người dùng chỉ chỉnh sửa/xóa được tài liệu và thư mục của chính mình; với mục được chia sẻ/công khai chỉ được xem. | Từ chối thao tác. |

### 7.2 Tài liệu và Lưu trữ

| ID | Quy tắc | Hệ quả khi vi phạm |
|----|---------|-------------------|
| BR-006 | Mỗi tài liệu tải lên phải gắn với một môn học trong chương trình đào tạo. | Không cho tải lên. |
| BR-007 | Người dùng chỉ gắn tài liệu vào môn học thuộc đúng ngành – học kỳ trong hồ sơ học thuật của mình. | Từ chối với thông báo lý do. |
| BR-008 | Chỉ chấp nhận tệp PDF, DOCX, PPTX. | Từ chối tải lên. |
| BR-009 | Tổng dung lượng không được vượt hạn mức của người dùng; mỗi tệp không vượt giới hạn hệ thống. | Từ chối tải lên; hoàn tác nếu vượt sau khi ghi nhận. |
| BR-010 | Tài liệu mặc định ở chế độ riêng tư; chỉ đặt công khai khi đã gắn môn học. | Từ chối đổi chế độ. |
| BR-011 | Xóa tài liệu/thư mục phải qua thùng rác trước khi xóa vĩnh viễn. | — |
| BR-012 | Khôi phục tài liệu trong thư mục đã xóa cần khôi phục thư mục cha trước. | Từ chối khôi phục. |
| BR-027 | Mục trong thùng rác quá 30 ngày bị hệ thống tự động xóa vĩnh viễn. | Không thể khôi phục sau khi đã tự xóa. |

### 7.3 Chia sẻ

| ID | Quy tắc | Hệ quả khi vi phạm |
|----|---------|-------------------|
| BR-013 | Quyền chia sẻ chỉ ở mức chỉ đọc. | — |
| BR-014 | Không tạo bản ghi chia sẻ trùng lặp cho cùng mục và cùng người nhận. | Bỏ qua/không tạo trùng. |
| BR-015 | Lời mời chia sẻ qua email hết hạn sau 7 ngày. | Không thể chấp nhận lời mời hết hạn. |
| BR-016 | Chỉ chủ sở hữu được thu hồi quyền chia sẻ. | Từ chối thao tác. |

### 7.4 Danh mục học thuật

| ID | Quy tắc | Hệ quả khi vi phạm |
|----|---------|-------------------|
| BR-017 | Mã Curriculum, Học kỳ, Môn học phải duy nhất, tự chuẩn hóa in hoa. | Từ chối tạo/cập nhật trùng. |
| BR-018 | Mục Course slot chỉ tạo được khi Curriculum, Học kỳ, Môn đều hoạt động và cặp Curriculum–Học kỳ đã được gán. | Từ chối tạo. |
| BR-019 | Bộ ba Curriculum–Học kỳ–Môn trong Course slot phải duy nhất. | Từ chối tạo trùng. |
| BR-020 | Không lưu trữ/vô hiệu hóa Curriculum, Học kỳ, Môn, hoặc gán Học kỳ–Curriculum khi vẫn còn người dùng hoặc tài liệu/course slot tham chiếu. | Từ chối với thông báo xung đột. |
| BR-021 | Không đổi định danh mục Course slot khi đã có tài liệu tham chiếu. | Từ chối thay đổi. |

### 7.5 Trò chuyện AI

| ID | Quy tắc | Hệ quả khi vi phạm |
|----|---------|-------------------|
| BR-022 | Câu trả lời của trợ lý AI chỉ dựa trên tài liệu trong ngữ cảnh mà người dùng được phép xem. | — |
| BR-023 | Câu trả lời phải kèm trích dẫn nguồn khi có. | — |
| BR-024 | Ở chế độ hỏi đáp, câu hỏi không được để trống. | Từ chối gửi. |
| BR-025 | Mỗi người dùng tối đa 50 lượt hỏi trợ lý AI mỗi ngày. | Từ chối khi vượt giới hạn trong ngày. |
| BR-026 | Phiên trò chuyện gắn ngữ cảnh tài liệu/thư mục đã xóa hoặc không còn tồn tại không hiển thị trong danh sách; truy cập trực tiếp hoặc gửi tin mới bị từ chối. | Ẩn khỏi danh sách; từ chối mở/gửi tin. |

---

## 8. USE CASES / USER STORIES

### UC-001: Đăng nhập và vào hệ thống
| | |
|--|--|
| **Actor chính** | Người dùng |
| **Mục tiêu** | Truy cập không gian học tập cá nhân. |
| **Điều kiện tiên quyết** | Có tài khoản Google được phép. |
| **Kết quả thành công** | Vào "Drive của tôi". |

**Luồng chính:**
1. Người dùng mở trang đăng nhập, nhấn đăng nhập bằng Google.
2. Hệ thống chuyển sang Google để xác thực.
3. Người dùng hoàn tất xác thực.
4. Hệ thống kiểm tra email được phép, đồng bộ hồ sơ và chuyển vào Drive của tôi.

**Luồng ngoại lệ:**
- **E1** Email không được phép: hệ thống từ chối với thông báo không có quyền truy cập.
- **E2** Kiểm tra quyền gặp sự cố: hệ thống báo lỗi tạm thời, yêu cầu thử lại.

### UC-002: Thiết lập hồ sơ học thuật
**Actor:** Người dùng — **Mục tiêu:** Chọn curriculum, học kỳ, môn đang học.
1. Người dùng mở Hồ sơ của tôi.
2. Chọn Curriculum → Học kỳ → các Môn đang học.
3. Nhấn "Lưu hồ sơ".
4. Hệ thống lưu và hiển thị "Đã lưu hồ sơ học thuật"; trạng thái "Đã hoàn thành".
- **E1** Thiếu curriculum/học kỳ/môn: hệ thống yêu cầu bổ sung, không lưu.

### UC-003: Tải tài liệu lên và xử lý
**Actor:** Người dùng — **Mục tiêu:** Đưa tài liệu vào hệ thống.
1. Người dùng nhấn "Tải lên" tại Drive của tôi.
2. Chọn tệp, chọn môn học, (tùy chọn) tiêu đề/thư mục/chế độ.
3. Hệ thống kiểm tra định dạng, hạn mức, môn học hợp lệ và lưu tệp.
4. Hệ thống tạo tài liệu, đưa vào hàng xử lý; trạng thái chuyển Đang xử lý → Sẵn sàng.
- **E1** Định dạng/hạn mức/môn học không hợp lệ: từ chối và nêu lý do.
- **E2** Xử lý thất bại: tài liệu chuyển trạng thái Thất bại, có thể thử lại.

### UC-004: Chia sẻ tài liệu cho người khác
**Actor:** Người dùng (chủ sở hữu) — **Mục tiêu:** Cho người khác xem tài liệu.
1. Người dùng chọn tài liệu/thư mục → mở cửa sổ chia sẻ.
2. Tìm người nhận theo email/tên hoặc nhập email.
3. Xác nhận chia sẻ.
4. Hệ thống tạo quyền chỉ đọc; với email chưa có tài khoản thì gửi lời mời.
- **A1** Người nhận chưa có tài khoản: hệ thống gửi lời mời qua email (hạn 7 ngày).
- **E1** Chia sẻ trùng người nhận: hệ thống không tạo bản ghi trùng.

### UC-005: Hỏi đáp với trợ lý AI
**Actor:** Người dùng — **Mục tiêu:** Nhận câu trả lời dựa trên tài liệu.
1. Người dùng mở Trò chuyện AI, tạo phiên với ngữ cảnh mong muốn.
2. Nhập câu hỏi và gửi.
3. Hệ thống trả lời (hiển thị dần) theo dạng ngắn gọn, tự nhiên như hội thoại, kèm trích dẫn nguồn và gợi ý câu hỏi tiếp theo ở chế độ hỏi đáp.
- **E1** Câu hỏi để trống ở chế độ hỏi đáp: hệ thống không gửi.

### UC-006: Quản trị viên quản lý chương trình đào tạo
**Actor:** Quản trị viên — **Mục tiêu:** Thiết lập môn học cho curriculum–học kỳ.
1. Quản trị viên mở Quản trị → Danh mục học thuật.
2. Tạo Curriculum/Học kỳ/Môn (nếu cần), gán Học kỳ cho Curriculum.
3. Tạo mục Course slot (Curriculum – Học kỳ – Môn).
4. Hệ thống kiểm tra ràng buộc và lưu.
- **E1** Thành phần không hoạt động / cặp chưa gán / trùng lặp: từ chối và nêu lý do.

### UC-007: Quản trị viên quản lý người dùng
**Actor:** Quản trị viên — **Mục tiêu:** Điều chỉnh quyền và hạn mức.
1. Quản trị viên mở Quản trị → Quản lý người dùng.
2. Tìm người dùng, mở chi tiết.
3. Cập nhật hạn mức lưu trữ / vai trò / trạng thái vô hiệu hóa.
4. Hệ thống lưu thay đổi.

### UC-008: Khôi phục tài liệu từ thùng rác
**Actor:** Người dùng — **Mục tiêu:** Lấy lại tài liệu đã xóa.
1. Người dùng mở Thùng rác.
2. Chọn tài liệu → Khôi phục.
3. Hệ thống đưa tài liệu trở lại Drive.
- **E1** Thư mục cha đã bị xóa: hệ thống yêu cầu khôi phục thư mục cha trước.

---

## 9. ERROR HANDLING

### 9.1 Nguyên tắc
- Mọi lỗi hiển thị thông báo rõ ràng, gợi ý hành động tiếp theo khi có thể.
- Không hiển thị thông tin kỹ thuật nội bộ với người dùng cuối.
- Lỗi được ghi nhận phía hệ thống để xử lý sự cố.

### 9.2 Phân loại lỗi

| Loại lỗi | Mô tả | Cách hiển thị |
|----------|-------|---------------|
| Dữ liệu không hợp lệ | Nhập thiếu/sai định dạng | Báo lỗi ngay trên trường liên quan |
| Chưa xác thực | Phiên hết hạn/chưa đăng nhập | Chuyển về trang đăng nhập |
| Không có quyền | Không đủ vai trò/không được phép email | Thông báo không có quyền |
| Không tìm thấy | Đối tượng không tồn tại | Thông báo không tìm thấy |
| Vi phạm quy tắc nghiệp vụ | Thao tác vi phạm chính sách | Nêu lý do cụ thể |
| Xung đột | Trùng lặp/đang được tham chiếu | Thông báo xung đột và hướng xử lý |
| Quá hạn mức/dung lượng | Vượt hạn mức lưu trữ hoặc giới hạn tệp | Thông báo và gợi ý dọn dẹp |
| Lỗi hệ thống | Lỗi nội bộ ngoài dự kiến | Thông báo chung, ghi log |

### 9.3 Các thông báo nghiệp vụ chính (tham khảo từ giao diện)

| ID | Tình huống | Thông báo |
|----|------------|-----------|
| ERR-001 | Không tải được danh sách tài liệu | "Không tải được tài liệu. Kiểm tra kết nối mạng và thử lại." |
| ERR-002 | Không tải được danh sách ngành | "Không tải được danh sách ngành. Vui lòng thử lại sau." |
| ERR-003 | Chưa chọn ngành/học kỳ/môn khi lưu hồ sơ | "Vui lòng chọn ngành / học kỳ / ít nhất 1 môn." |
| ERR-004 | Tên hiển thị trống/quá dài | "Vui lòng nhập tên hiển thị." / "Tên hiển thị tối đa 100 ký tự." |
| ERR-005 | Email không được phép truy cập | Thông báo không có quyền truy cập hệ thống. |
| ERR-006 | Vượt hạn mức lưu trữ / tệp quá lớn | Thông báo vượt hạn mức hoặc tệp vượt giới hạn (tối đa 50 MB/tệp, 500 MB/người). |
| ERR-007 | Vượt giới hạn hỏi trợ lý AI trong ngày | Thông báo đã đạt giới hạn 50 lượt/ngày, mời thử lại sau. |

---

## 10. SECURITY REQUIREMENTS

### 10.1 Xác thực
- Người dùng phải đăng nhập (qua Google) trước khi truy cập tính năng.
- Chỉ email thuộc tên miền được phép (mặc định fpt.edu.vn, fe.edu.vn) hoặc email truy cập ngoại lệ mới được vào.
- Phiên có thời hạn; người dùng có thể chủ động đăng xuất, khi đó dữ liệu phiên được xóa khỏi thiết bị.
- Việc quản lý thời hạn phiên, gia hạn (làm mới) phiên và khóa tài khoản tuân theo cơ chế mặc định của dịch vụ xác thực Cognito; hệ thống không đặt thêm chính sách riêng.

### 10.2 Phân quyền
**Mô hình:** Phân quyền theo vai trò (Người dùng, Quản trị viên).

| Nhóm tính năng | Người dùng | Quản trị viên |
|----------------|-----------|---------------|
| Tài liệu & Thư mục cá nhân | ✅ Của mình | ✅ Của mình |
| Mục được chia sẻ/công khai | ✅ Chỉ đọc | ✅ Chỉ đọc |
| Chia sẻ | ✅ Của mình | ✅ Của mình |
| Tìm kiếm & Trò chuyện AI | ✅ | ✅ |
| Đọc danh mục học thuật | ✅ | ✅ |
| Quản lý danh mục học thuật | ❌ | ✅ |
| Quản lý người dùng | ❌ | ✅ |
| Quản lý email truy cập | ❌ | ✅ |
| Thống kê hệ thống | ❌ | ✅ |

**Quy tắc đặc biệt:**
- Người dùng chỉ thao tác trên dữ liệu của chính mình; mục được chia sẻ/công khai chỉ ở mức chỉ đọc.
- Tài liệu chỉ được tìm thấy/đưa vào trò chuyện trong phạm vi quyền truy cập của người dùng.

### 10.3 Bảo vệ dữ liệu

| Yêu cầu | Mô tả |
|---------|-------|
| Cô lập dữ liệu phiên | Khi đăng xuất, dữ liệu phiên (bộ nhớ đệm) bị xóa để tránh lộ dữ liệu sang người dùng khác. |
| Giới hạn dữ liệu trả về | Hệ thống không trả thông tin nhạy cảm không cần thiết. |
| Kiểm soát truy cập tệp | Tệp chỉ truy cập qua liên kết có thời hạn do hệ thống cấp. |
| Mã hóa đường truyền | Dữ liệu giữa thiết bị và máy chủ được mã hóa. |
| Phạm vi đồ án | Là sản phẩm đồ án; chưa áp dụng chính sách lưu log và kiểm toán bảo mật định kỳ chính thức. |

---

## 11. ACCEPTANCE CRITERIA

### Đăng nhập (FR-001, FR-002)
- [ ] AC-001-01: Khi người dùng có email được phép đăng nhập thành công, hệ thống chuyển vào "Drive của tôi".
- [ ] AC-001-02: Khi email không thuộc tên miền được phép và không có trong danh sách ngoại lệ, hệ thống từ chối với thông báo không có quyền.
- [ ] AC-001-03: Khi tài khoản bị vô hiệu hóa, hệ thống từ chối mọi thao tác nghiệp vụ.

### Hồ sơ học thuật (FR-009, FR-010, FR-011)
- [ ] AC-009-01: Khi chọn đủ ngành, học kỳ và ít nhất một môn hợp lệ, hệ thống lưu và đánh dấu hồ sơ "Đã hoàn thành".
- [ ] AC-009-02: Khi chọn học kỳ không thuộc ngành, hệ thống không cho lưu.
- [ ] AC-009-03: Khi chưa chọn môn nào, hệ thống yêu cầu chọn ít nhất một môn.
- [ ] AC-009-04: Khi chọn hoặc đổi Học kỳ, giao diện mặc định chọn tất cả môn trong CTĐT của học kỳ đó; lưu sau khi bỏ bớt vẫn hợp lệ nếu còn ít nhất một môn.
- [ ] AC-063-01: Khi chọn tab học kỳ trên Drive, hệ thống nhóm tài liệu theo học kỳ đó mà không thay đổi hồ sơ đã lưu trên server.
- [ ] AC-064-01: Khi dùng lối tắt「Chọn học kỳ」từ Drive, hệ thống cập nhật học kỳ chính và môn mặc định theo CTĐT trong một lần lưu.

### Tải tài liệu (FR-013, FR-014, FR-019)
- [ ] AC-013-01: Khi tải tệp PDF/DOCX/PPTX hợp lệ kèm môn học thuộc hồ sơ, hệ thống tạo tài liệu và bắt đầu xử lý.
- [ ] AC-013-02: Khi tệp sai định dạng hoặc vượt hạn mức, hệ thống từ chối và nêu lý do.
- [ ] AC-013-03: Khi đặt tài liệu công khai mà chưa gắn môn học, hệ thống từ chối.

### Chia sẻ (FR-028, FR-029, FR-033, FR-034)
- [ ] AC-028-01: Khi chia sẻ cho người dùng có tài khoản, mục xuất hiện trong "được chia sẻ với tôi" của họ ở mức chỉ đọc.
- [ ] AC-028-02: Khi chia sẻ qua email chưa có tài khoản, hệ thống gửi lời mời có hạn 7 ngày.
- [ ] AC-028-03: Khi chia sẻ trùng người nhận, hệ thống không tạo bản ghi trùng.

### Danh mục học thuật (FR-058, FR-060, BR-020)
- [ ] AC-058-01: Khi tạo Course slot với thành phần hoạt động và cặp Curriculum–Học kỳ đã gán, hệ thống lưu thành công.
- [ ] AC-058-02: Khi lưu trữ Curriculum/Học kỳ/Môn đang được tham chiếu, hệ thống từ chối với thông báo xung đột.
- [ ] AC-058-03: Khi đổi định danh Course slot đã có tài liệu tham chiếu, hệ thống từ chối.

### Trò chuyện AI (FR-041, FR-042, FR-044)
- [ ] AC-041-01: Khi người dùng đặt câu hỏi trong ngữ cảnh có tài liệu, hệ thống trả lời kèm trích dẫn nguồn.
- [ ] AC-041-02: Khi gửi câu hỏi trống ở chế độ hỏi đáp, hệ thống không gửi.
- [ ] AC-044-01: Khi tài liệu hoặc thư mục ngữ cảnh của phiên đã vào thùng rác hoặc bị xóa vĩnh viễn, phiên không còn trong danh sách; mở URL trực tiếp hoặc gửi tin mới bị từ chối.
- [ ] AC-041-03: Khi người dùng hỏi ở chế độ hỏi đáp, phản hồi ưu tiên ngắn gọn, tự nhiên như hội thoại và trả tối đa 3 gợi ý câu hỏi tiếp theo.

---

## 12. APPENDIX

### A. Bảng tra cứu ID

| Loại | Dải ID |
|------|--------|
| Yêu cầu chức năng | FR-001 đến FR-064 |
| Yêu cầu phi chức năng | NFR-P/S/A/SC/R |
| Quy tắc nghiệp vụ | BR-001 đến BR-027 |
| Tình huống sử dụng | UC-001 đến UC-008 |
| Tiêu chí nghiệm thu | AC-[FR-ID]-[thứ tự] |
| Mã lỗi | ERR-001 đến ERR-007 |

### B. Tổng hợp các điểm đã xác nhận

Các điểm trước đây đánh dấu [CẦN XÁC NHẬN] đã được Product Owner xác nhận trong quá trình review:

| # | Mục | Quyết định đã chốt |
| --- | --- | --- |
| 1 | 1.2 | Thư viện công khai chỉ duyệt/xem tài liệu (2 chế độ Diễn đàn & Thư viện), **không có bình luận/diễn đàn thảo luận**. Quản lý điểm và tích hợp LMS/FAP **ngoài phạm vi**. |
| 2 | 2.4 | Hỗ trợ chính thức: **trình duyệt hiện đại trên máy tính + web trên di động** (responsive). Không cam kết app native trong phạm vi tài liệu. |
| 3 | 2.5 / 10.3 | Sản phẩm đồ án; bảo vệ dữ liệu theo điều khoản dịch vụ đám mây tích hợp; chưa áp dụng kiểm toán bảo mật định kỳ. |
| 4 | 4.1 / 4.3 / 4.4 | **Đồ án, không ràng buộc SLA**; vận hành theo mức "tốt nhất có thể". |
| 5 | 10.1 | Thời hạn phiên và khóa tài khoản theo **mặc định của Cognito**, không đặt chính sách riêng. |

> Không còn điểm [CẦN XÁC NHẬN] tồn đọng trong tài liệu.

### C. Lịch sử phiên bản

| Phiên bản | Ngày | Mô tả |
|-----------|------|-------|
| 1.0.0 | 2026-06-29 | Tái tạo lần đầu từ source code fullstack (api + web + mobile) |
