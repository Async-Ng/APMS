# UI Design System

Tài liệu này mô tả hướng giao diện hiện tại của APMS. Nội dung không khẳng định web/mobile đã hoàn tất migration sang unified Documents API; phần client sẽ được cập nhật theo source code ở phase riêng.

## Visual Direction

APMS dùng phong cách neo-brutalism học thuật: rõ ràng, mạnh, tương phản cao, ít trang trí thừa. Mục tiêu là tạo cảm giác công cụ học tập chắc chắn, nhanh, và dễ hiểu.

## Brand Colors

| Token | Gợi ý |
| --- | --- |
| Primary | FPT orange |
| Secondary | Deep blue / navy |
| Accent | Green hoặc cyan cho trạng thái tích cực |
| Surface | Warm off-white hoặc neutral light |
| Border | High-contrast dark border |
| Danger | Red với contrast đủ cao |

## Component Principles

- Button có border rõ, trạng thái hover/pressed khác biệt.
- Card dùng shadow/border có chủ đích, không quá “soft”.
- Table/list ưu tiên scan nhanh: title, course, owner/source, status, actions.
- Empty state phải nói rõ user cần làm gì tiếp theo.
- Upload form phải thể hiện rõ môn học bắt buộc và visibility `private/public`.
- Public document surfaces nên hiển thị course và owner để người dùng hiểu ngữ cảnh.

## Documents UX Terms

Thuật ngữ sản phẩm nên gom về `Tài liệu` / `Documents`.

| Term | Dùng cho |
| --- | --- |
| `Của tôi` | Owned folders/documents |
| `Được chia sẻ` | Shared resources |
| `Công khai` | Public documents |
| `Đã đánh dấu` | Starred |
| `Thùng rác` | Trash |

Không dùng lại Drive/Library/Forum như ba sản phẩm riêng nếu đang mô tả API hiện tại.

## Accessibility

- Text và interactive controls cần đạt contrast tốt trên nền sáng.
- Focus state phải nhìn thấy bằng bàn phím.
- Icon-only buttons cần label/accessibility text.
- Không chỉ dùng màu để biểu thị trạng thái processing/ready/failed.
