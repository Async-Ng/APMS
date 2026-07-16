# Khung Nội Dung Slide Báo Cáo APMS

Tài liệu này mô tả nội dung cho bộ slide báo cáo ngắn gọn của dự án **APMS - Academic Personal Management System**. Bộ slide gồm đúng 6 slide, tập trung vào giá trị cốt lõi của hệ thống: quản lý tài liệu học tập theo môn học, kiểm soát quyền truy cập, tìm kiếm ngữ nghĩa và RAG Chat có trích dẫn mở lại đúng nguồn.

## Slide 1 - APMS: Trung Tâm Tài Liệu Học Tập Cá Nhân

**Tiêu đề:** APMS - Academic Personal Management System  
**Phụ đề:** Quản lý tài liệu theo môn học, tìm kiếm nội dung và hỏi AI có trích dẫn nguồn.

**Nội dung:**
- Hệ thống hỗ trợ sinh viên lưu trữ và tổ chức tài liệu học tập.
- Mỗi tài liệu được gắn với chương trình đào tạo và môn học cụ thể.
- Hỗ trợ các định dạng học tập phổ biến: PDF, DOCX, PPTX.
- AI trả lời dựa trên tài liệu người dùng được phép xem và có citation mở lại đúng nguồn.
- Quản trị viên quản lý người dùng, quyền truy cập và danh mục học thuật.

**Gợi ý hình ảnh:** logo/tên APMS kết hợp 3 biểu tượng: Document, Search, AI Citation.

## Slide 2 - Vấn Đề Và Mục Tiêu

**Vấn đề hiện tại:**
- Tài liệu học tập nằm rải rác ở nhiều nơi.
- Sinh viên khó phân loại tài liệu theo curriculum, học kỳ và môn học.
- Tìm kiếm trong nội dung PDF/DOCX/PPTX mất thời gian.
- Tài liệu chia sẻ thiếu kiểm soát quyền xem.
- Câu trả lời AI khó tin cậy nếu không truy ngược được nguồn.

**Mục tiêu của APMS:**
- Gom tài liệu học tập về một workspace thống nhất.
- Bắt buộc gắn tài liệu với môn học để dữ liệu có cấu trúc.
- Cho phép quản lý, chia sẻ read-only và công khai tài liệu học tập.
- Hỗ trợ semantic search và RAG Chat có citation.
- Khi nguồn không đủ, AI phải nói chưa đủ thông tin thay vì suy diễn.

## Slide 3 - Phạm Vi Và Người Dùng

**Người dùng chính:**
- **Sinh viên:** đăng nhập, chọn curriculum, upload tài liệu, quản lý thư mục, chia sẻ, tìm kiếm và hỏi AI.
- **Quản trị viên:** quản lý user, quota, access email, curriculum, semester, subject và course slot.

**Trong phạm vi:**
- Đăng nhập Google/Cognito với allowlist domain/email.
- Hồ sơ học vụ theo curriculum.
- Upload và xử lý PDF/DOCX/PPTX.
- Drive cá nhân, shared, public, starred, trash.
- Semantic search và Chat AI có citation.
- Mở citation về đúng tài liệu/trang/chunk khi metadata khả dụng.

**Ngoài phạm vi:**
- Không chỉnh sửa nội dung file trực tiếp.
- Không cộng tác realtime trên tài liệu.
- Không quản lý điểm, LMS/FAP.
- Không diễn đàn hoặc bình luận học tập.

## Slide 4 - Quy Tắc Nghiệp Vụ Chính

**Nội dung:**
- Đăng nhập chỉ cho email thuộc domain được phép hoặc access email ngoại lệ.
- Sinh viên phải chọn curriculum hợp lệ trước khi dùng đầy đủ hệ thống.
- Mỗi tài liệu upload phải gắn với course slot thuộc curriculum của sinh viên.
- File hỗ trợ PDF/DOCX/PPTX, tối đa 50 MB/file; quota mặc định 500 MB/user.
- Tài liệu mặc định private; owner có thể share read-only, đặt public, hoặc chuyển vào trash.
- Chat AI giới hạn 50 lượt/user/ngày và chỉ trả lời theo nguồn được phép đọc; citation phải mở được hoặc bị loại.

**Gợi ý hình ảnh:** bảng 2 cột `Quy tắc` / `Giá trị`.

## Slide 5 - 3 Luồng Nghiệp Vụ Chính

**Nội dung:**
- **Flow 1 - Truy cập hệ thống & hồ sơ học vụ:** Google Login -> kiểm tra quyền truy cập -> sync user -> chọn curriculum -> vào Drive.
- **Flow 2 - Vòng đời tài liệu học tập:** Upload file -> validate course/quota/type -> S3 + metadata -> extract/chunk/embed -> ready trong Drive -> share/public/trash.
- **Flow 3 - Search & RAG Chat có citation:** User hỏi/tìm kiếm -> kiểm tra quyền đọc -> retrieval/rerank/evidence gate -> Gemini trả lời có citation -> click mở đúng nguồn.

**Hình chèn vào slide:**
- `docs/diagrams/apms-main-flow-1-access-profile-activity.png`
- `docs/diagrams/apms-main-flow-2-document-lifecycle-activity.png`
- `docs/diagrams/apms-main-flow-3-search-rag-citation-activity.png`

**File nguồn có thể chỉnh sửa bằng draw.io:**
- `docs/diagrams/apms-main-flow-1-access-profile-activity.drawio`
- `docs/diagrams/apms-main-flow-2-document-lifecycle-activity.drawio`
- `docs/diagrams/apms-main-flow-3-search-rag-citation-activity.drawio`

**Ghi chú thuyết trình:**
- Nhấn mạnh mỗi UML Activity Diagram có swimlane để thấy rõ đâu là thao tác người dùng, đâu là xử lý APMS, đâu là external service/database.
- Nếu slide quá chật, tách Slide 5 thành 3 biến thể phụ khi trình bày demo, nhưng outline chính vẫn giữ 6 slide.
- Nếu hội đồng hỏi về kiến trúc hệ thống, dùng thêm C4 C2 Container Diagram: `docs/diagrams/apms-c2-container.png`.

## Slide 6 - Kết Luận Và Hướng Phát Triển

**Kết luận:**
- APMS giúp tài liệu học tập được quản lý có cấu trúc theo curriculum và môn học.
- Hệ thống gom quản lý tài liệu, chia sẻ, public discovery, search và AI vào một trải nghiệm thống nhất.
- Phân quyền private/share/public giúp bảo vệ tài liệu cá nhân.
- Citation deep link giúp câu trả lời AI có thể kiểm chứng lại từ nguồn.
- Evidence gate giảm rủi ro AI trả lời không có căn cứ.

**Hướng phát triển:**
- Hoàn thiện kiểm thử tự động cho API, web và RAG quality.
- Cải thiện highlight chính xác trong PDF/DOCX và trải nghiệm PPTX.
- Bổ sung dashboard thống kê tài liệu, tìm kiếm và mức sử dụng AI.
- Tối ưu chi phí/tốc độ xử lý embedding và chat.
- Hoàn thiện mobile và trang quản trị.

## Hướng Dẫn Thiết Kế Cho Agent

- Dựng đúng 6 slide.
- Mỗi slide chỉ nên có 4-6 ý chính, tránh quá nhiều chữ.
- Slide 5 dùng 3 UML Activity Diagram vẽ bằng draw.io để giảm chữ.
- Sơ đồ kiến trúc bổ sung dùng C4 C2 Container Diagram, không trộn lẫn với 3 flow nghiệp vụ.
- Không dùng metric giả, testimonial giả hoặc mô tả các tính năng chưa có.
- Không mô tả Drive/Library/Forum như ba sản phẩm tách rời.
- Không dùng tên field, enum, API route hoặc từ viết kiểu code trên slide, trừ ghi chú nguồn cho agent.
- Có thể giữ tên công nghệ phổ biến khi cần, ví dụ Google/Cognito, PDF, DOCX, PPTX, AI.
- Ưu tiên câu ngắn, dễ thuyết trình; mỗi bullet nên là một ý nghiệp vụ rõ ràng.
- Phong cách: chuyên nghiệp, rõ ràng, phù hợp báo cáo đồ án.

## Giả Định

- Tài liệu này là outline nội dung, chưa phải file PowerPoint hoàn chỉnh.
- Bộ slide chính giữ đúng 6 slide; nếu cần thuyết trình chi tiết hơn, Slide 5 có thể tách phụ thành 3 slide flow khi demo.
- Các sơ đồ chính nằm trong `docs/diagrams` và được chỉnh sửa bằng draw.io.
