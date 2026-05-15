# APMS - Hệ thống Thiết kế UI/UX (UI/UX Design System)

Tài liệu này định nghĩa hệ thống thiết kế giao diện và trải nghiệm người dùng cho APMS, dựa trên định hướng: **"Playful educational platform, claymorphism cards, vibrant, engaging colors"**.

## 1. Phong cách chủ đạo (Core Style)

- **Claymorphism (Đất sét 3D):** Giao diện mềm mại, thân thiện, trông giống như các khối đất sét nổi 3D hoặc được ép xuống nền. Giúp giảm căng thẳng học tập và tạo cảm giác tương tác thú vị.
- **Playful & Vibrant:** Sử dụng màu sắc tươi sáng, năng động để kích thích cảm hứng học tập nhưng vẫn giữ được độ tương phản tốt để đọc tài liệu.
- **Giao diện thân thiện (Friendly UI):** Góc bo tròn lớn (Large border-radius), typography dạng bo tròn (rounded fonts).

## 2. Hệ thống màu sắc (Color Palette)

Hệ thống màu sắc cần tươi sáng (vibrant) nhưng phải đảm bảo tiêu chuẩn tương phản (Contrast 4.5:1 cho text).

- **Background (Nền):** Soft Off-White `#F8FAFC` (giúp các thẻ Claymorphism nổi bật).
- **Primary (Thương hiệu/CTA):** Vibrant Purple `#8B5CF6` (Tạo cảm giác sáng tạo, công nghệ AI).
- **Secondary (Nhấn/Trạng thái):** 
  - Playful Coral `#FF719A` (Dùng cho thông báo, chú ý).
  - Mint Green `#10B981` (Dùng cho trạng thái thành công, theo dõi tiến độ).
- **Surface (Nền Component):** White `#FFFFFF` hoặc màu nền nhạt của Primary `#EDE9FE`.
- **Text (Chữ):** Slate-900 `#0F172A` (cho tiêu đề) và Slate-700 `#334155` (cho nội dung).

## 3. Nghệ thuật chữ (Typography)

Sử dụng Font Pairing kết hợp giữa sự thân thiện và tính dễ đọc của tài liệu học thuật.

- **Headings (Tiêu đề):** `Quicksand` hoặc `Nunito` (Font bo tròn, thân thiện, playful).
  - Font-weight: 700 (Bold) hoặc 800 (ExtraBold).
- **Body Text (Nội dung tài liệu/Chat):** `Inter` (Font không chân sạch sẽ, dễ đọc nội dung dài).
  - Kích thước chuẩn: Base 16px, Line-height: 1.5 - 1.6 để thoải mái cho mắt.

## 4. Hệ thống Component (Claymorphism Guidelines)

### 4.1. Cards (Thẻ tài liệu, Course Catalog)
- **Border Radius:** `24px` hoặc `32px` (rất bo tròn).
- **Shadow (Hiệu ứng 3D):** Cần kết hợp 2 lớp shadow:
  - Một lớp Drop shadow nhẹ phía ngoài tạo độ nổi.
  - Một lớp Inner shadow trắng phía trên-trái (tạo ánh sáng).
  - Một lớp Inner shadow tối phía dưới-phải (tạo độ dày của "đất sét").
- **Tương tác:** Khi Hover, card nổi lên một chút (`translate-y-1`) bằng Spring Animation.

### 4.2. Buttons (Nút bấm, Enrollment CTA)
- Hình dáng: Pill-shape (Bo tròn hoàn toàn 9999px).
- Hiệu ứng: Cùng phong cách Claymorphism nhưng nổi hơn nền.
- Trạng thái `:active`: Nút lún xuống (Scale 0.95), thay đổi shadow để mô phỏng việc bị ấn xuống.

### 4.3. RAG Chatbot UI
- **Tin nhắn AI:** Thẻ bong bóng dạng Claymorphism màu nền nhạt (`#EDE9FE`).
- **Tin nhắn User:** Thẻ bong bóng màu Primary (`#8B5CF6`), chữ trắng.
- **Trích dẫn (Citations):** Nút nhỏ đính kèm trong tin nhắn, click vào sẽ cuộn mượt (smooth scroll) đến trang PDF tương ứng ở màn hình bên cạnh (Split-screen).

## 5. Nguyên tắc UX (UX Guidelines)

Tuân thủ các nguyên tắc từ `ui-ux-pro-max` skill:

- **Accessibility (CRITICAL):**
  - Mọi nút bấm/icon (đặc biệt trên mobile) phải có kích thước chạm tối thiểu `44x44px`.
  - Phải có Focus ring rõ ràng (2-4px) khi sử dụng phím Tab để điều hướng.
- **Animation & Interactions (HIGH):**
  - Sử dụng **Spring Physics** cho các chuyển động (Card hover, mở Modal, đóng/mở Chat) để tạo cảm giác tự nhiên, nảy nhẹ của phong cách Playful.
  - Duration từ 200ms - 300ms, không được quá chậm.
- **Layout & Responsive:**
  - Thiết kế Mobile-first.
  - Mobile: Navigation Bar nằm ở đáy (Bottom Nav) tối đa 5 items.
  - Desktop: Sidebar kết hợp Grid Bento cho trang Dashboard.
  - Không xuất hiện thanh cuộn ngang (No horizontal scroll) trên toàn bộ thiết bị.
