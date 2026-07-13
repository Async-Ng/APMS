# Khung Nội Dung Slide Báo Cáo APMS

Tài liệu này mô tả nội dung cho bộ slide báo cáo ngắn gọn của dự án **APMS - Academic Personal Management System**. Bộ slide gồm đúng 6 slide, tập trung vào giới thiệu dự án, vấn đề, phạm vi, quy tắc nghiệp vụ, luồng nghiệp vụ chính và kết luận.

## Slide 1 - Trang bìa

**Tiêu đề:** APMS - Academic Personal Management System  
**Phụ đề:** Hệ thống quản lý tài liệu học tập cá nhân cho sinh viên

**Nội dung:**
- Môn học / đồ án: WDP301
- Nhóm thực hiện: [Tên nhóm]
- Thành viên: [Danh sách thành viên]
- Giảng viên hướng dẫn: [Tên GVHD]
- Thời gian: [Học kỳ / năm]

**Gợi ý hình ảnh:** biểu tượng tài liệu, thư mục, tìm kiếm hoặc AI.

## Slide 2 - Vấn đề và mục tiêu

**Tiêu đề:** Vấn đề và mục tiêu

**Vấn đề hiện tại:**
- Tài liệu học tập bị phân tán ở nhiều nơi.
- Khó phân loại theo chương trình đào tạo, học kỳ và môn học.
- Khó tìm kiếm nội dung bên trong file.
- Chia sẻ tài liệu thiếu kiểm soát quyền truy cập.
- Sinh viên cần công cụ hỗ trợ hỏi đáp, tóm tắt và ôn tập bằng AI.

**Mục tiêu của hệ thống:**
- Gom tài liệu học tập vào một hệ thống thống nhất.
- Mỗi tài liệu được liên kết với một môn học cụ thể trong chương trình đào tạo.
- Hỗ trợ quản lý, chia sẻ, tìm kiếm và hỏi đáp với trợ lý AI kèm nguồn tham khảo từ tài liệu.
- Cung cấp công cụ quản trị người dùng và danh mục học thuật.

## Slide 3 - Phạm vi và người dùng

**Tiêu đề:** Phạm vi và người dùng

**Phạm vi chức năng:**
- Đăng nhập bằng Google/Cognito.
- Thiết lập hồ sơ học thuật của sinh viên.
- Quản lý tài liệu và thư mục học tập.
- Chia sẻ tài liệu cho người khác xem nhưng không cho chỉnh sửa.
- Cho phép người dùng hợp lệ xem tài liệu được công khai trong hệ thống.
- Tìm kiếm tài liệu theo ý nghĩa nội dung.
- Hỏi đáp với trợ lý AI có nguồn tham khảo từ tài liệu.
- Quản trị người dùng và danh mục học thuật.

**Ngoài phạm vi:**
- Không chỉnh sửa trực tiếp nội dung file.
- Không cộng tác chỉnh sửa theo thời gian thực.
- Không quản lý điểm hoặc tích hợp LMS/FAP.
- Không có bình luận hoặc diễn đàn thảo luận.

**Người dùng chính:**
- **Sinh viên:** tải lên và quản lý tài liệu học tập cá nhân, sắp xếp theo thư mục và môn học, tìm kiếm nội dung cần học, đặt câu hỏi cho trợ lý AI dựa trên tài liệu đã lưu.
- **Quản trị viên:** quản lý danh sách người dùng, email hoặc tên miền được phép truy cập, chương trình đào tạo, học kỳ, môn học và dữ liệu nền để sinh viên sử dụng hệ thống đúng cấu trúc.

## Slide 4 - Quy tắc nghiệp vụ chính

**Tiêu đề:** Quy tắc nghiệp vụ chính

**Nội dung:**
- Mỗi tài liệu tải lên phải gắn với một môn học cụ thể.
- File hỗ trợ gồm PDF, DOCX và PPTX.
- Mỗi file có dung lượng tối đa 50 MB.
- Mỗi người dùng có hạn mức lưu trữ mặc định 500 MB.
- Tài liệu có hai chế độ hiển thị: chỉ người được phép xem hoặc mọi người dùng hợp lệ trong hệ thống có thể xem.
- Tài liệu mới tải lên mặc định chỉ chủ sở hữu xem được.
- Người được chia sẻ chỉ được xem, không được chỉnh sửa.
- Lời mời chia sẻ hết hạn sau 7 ngày.
- Tài liệu trong thùng rác quá 30 ngày sẽ bị xóa vĩnh viễn.
- Trợ lý AI giới hạn 50 lượt hỏi cho mỗi người dùng trong một ngày.

**Gợi ý hình ảnh:** bảng 2 cột: Quy tắc / Giá trị.

## Slide 5 - Luồng nghiệp vụ chính

**Tiêu đề:** Luồng nghiệp vụ chính

**Nội dung:**
- **Luồng 1:** Đăng nhập và thiết lập hồ sơ học thuật.
- **Luồng 2:** Quản lý tài liệu học tập.
- **Luồng 3:** Tìm kiếm tri thức và học với trợ lý AI.

**Ghi chú thuyết trình:**
- Luồng 1 mô tả cách sinh viên đăng nhập và hoàn tất hồ sơ học thuật.
- Luồng 2 mô tả cách sinh viên tải lên, sắp xếp, chia sẻ và xử lý tài liệu trong thùng rác.
- Luồng 3 mô tả cách sinh viên tìm tài liệu theo nội dung, xem tài liệu được công khai và đặt câu hỏi cho trợ lý AI.

**Gợi ý hình ảnh:** chèn 3 activity diagram hoặc 3 thẻ đại diện cho 3 luồng.

**Nguồn sơ đồ:**
- `docs/diagrams/apms-activity-1.puml`
- `docs/diagrams/apms-activity-2.puml`
- `docs/diagrams/apms-activity-3.puml`

## Slide 6 - Kết luận và hướng phát triển

**Tiêu đề:** Kết luận và hướng phát triển

**Kết luận:**
- APMS giúp sinh viên quản lý tài liệu học tập có cấu trúc.
- Hệ thống kết hợp quản lý tài liệu, chia sẻ tài liệu, danh mục học thuật, tìm kiếm theo ý nghĩa nội dung và trợ lý AI.
- Cơ chế phân quyền giúp bảo vệ tài liệu riêng tư của sinh viên.
- Trợ lý AI có nguồn tham khảo hỗ trợ sinh viên học tập và ôn tập hiệu quả hơn.

**Hướng phát triển:**
- Cải thiện chất lượng xử lý tài liệu.
- Tối ưu tốc độ tìm kiếm, hỏi đáp và chi phí AI.
- Bổ sung kiểm thử tự động.
- Hoàn thiện trải nghiệm trên thiết bị di động.
- Nâng cấp trang quản trị.
- Thêm thống kê và phân tích về tài liệu, lượt tìm kiếm và mức sử dụng AI.

## Hướng Dẫn Thiết Kế Cho Agent

- Dựng đúng 6 slide.
- Không thêm lại các slide đã bỏ: System Architecture, Unified Document API, AI/RAG Pipeline, Demo/Testing/Results.
- Mỗi slide chỉ nên có 4-6 ý chính, tránh quá nhiều chữ.
- Slide 5 nên dùng sơ đồ hoặc activity diagrams để giảm chữ.
- Không dùng tên field, enum, API route hoặc từ viết kiểu code trên slide.
- Có thể giữ tên công nghệ phổ biến khi cần, ví dụ Google/Cognito, PDF, DOCX, PPTX, AI.
- Ưu tiên câu ngắn, dễ thuyết trình; mỗi bullet nên là một ý nghiệp vụ rõ ràng.
- Phong cách: chuyên nghiệp, rõ ràng, phù hợp báo cáo đồ án.

## Giả định

- "Slice" được hiểu là "slide".
- Các slide bị bỏ là slide 6, 7, 8, 9 trong bản 10-slide trước đó.
- Slide 10 cũ được giữ lại và đánh số lại thành Slide 6.
