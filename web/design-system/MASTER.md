# APMS Design System — Evolved Brutalism

## Visual direction

Giữ tinh thần neo-brutalism FPT (viền đậm, màu thương hiệu) nhưng giảm mỏi mắt khi dùng lâu: viền 2px mặc định, shadow nhẹ cho card, shadow đậm cho CTA/modal.

## Color tokens

| Token | Usage |
|-------|--------|
| `brutal-primary` (FPT orange) | Một CTA chính mỗi viewport |
| `brutal-secondary` (FPT blue) | Liên kết phụ, avatar fallback |
| `brutal-accent` (FPT green) | Trạng thái thành công, storage OK |
| `brutal-danger` | Xóa, hết quota, cảnh báo |
| `brutal-bg` | Nền trang (#fff8f4) |
| `brutal-surface` | Card, panel (#ffffff) |

## Typography

- **Heading:** Outfit 700–800 — chỉ tiêu đề trang và section
- **Body:** Inter 400–600 — nội dung, form, mô tả
- Body tối thiểu 16px (1rem)

## Spacing

Hệ 4/8dp: `gap-2`, `p-4`, `space-y-6` cho section.

## Elevation

1. `shadow-brutal-sm` — card danh sách
2. `shadow-brutal` — card nhấn, modal
3. `shadow-brutal-lg` — hover emphasis

## Interaction

- Touch target ≥ 44px
- Micro-interaction 150–300ms
- `prefers-reduced-motion`: tắt transform press
- Một primary button nổi bật mỗi màn

## Copy tone (tiếng Việt)

- Giải thích **vì sao**, không chỉ báo lỗi
- Tránh thuật ngữ kỹ thuật với sinh viên
- Ví dụ: "Chưa chọn môn học kỳ này — Drive chưa sắp xếp được theo môn"

## Components

| Primitive | File |
|-----------|------|
| Button | `BrutalButton` |
| Card | `BrutalCard` |
| Modal | `BrutalModal` |
| Tabs | `BrutalTabs` |
| Spinner | `Spinner` |
| Empty | `EmptyState` |
