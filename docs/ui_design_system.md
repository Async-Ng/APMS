# APMS - UI/UX Design System (Neo-brutalism + FPT Brand)

Giao diện APMS theo **Neo-brutalism** (viền đen dày, shadow cứng offset) kết hợp **3 màu logo FPT University**.

## 1. Phong cách chủ đạo

- **Neo-brutalism:** Khối UI rõ ràng, viền ink đậm, shadow không blur.
- **FPT brand:** Ba màu logo — Blue (F), Orange (P), Green (T).
- **Playful & engaging:** Landing LearnHub-style trên `/login` (catalog, progress, testimonials, CTA).

## 2. Brand FPT — 3 màu logo

| Khối | Tên | Hex | Token |
|------|-----|-----|-------|
| **F** | FPT Blue (light) | `#2B8FD4` | `--color-fpt-blue` / `brutal-secondary` |
| **P** | FPT Orange | `#F37021` | `--color-fpt-orange` / `brutal-primary` |
| **T** | FPT Green | `#33B04A` | `--color-fpt-green` / `brutal-accent` |

**Neutral:**

| Token | Hex | Dùng cho |
|-------|-----|----------|
| Background | `#FFF8F4` | Nền trang |
| Surface | `#FFFFFF` | Card |
| Ink | `#1A1A1A` | Viền, shadow, body text |
| On-brand | `#FFFFFF` | Chữ trên nền FPT |
| Muted | `#334155` | Mô tả phụ |

**Quy tắc:** Chữ trắng trên khối màu FPT; chữ ink trên nền trắng/cream.

## 3. Typography

- **Headings:** `Outfit` — 700–800.
- **Body:** `Inter` — 16px, line-height 1.5–1.6.

## 4. Components

### 4.1. Cards

- Nền trắng (hoặc màu FPT), viền `3px solid #1A1A1A`, `border-radius: 16px`.
- Shadow: `4px 4px 0 #1A1A1A`.
- Hover (tùy chọn): `translate(-2px, -2px)`, shadow `6px 6px 0`.

### 4.2. Buttons

- Primary: nền **FPT Orange**, chữ trắng.
- Secondary: nền **FPT Blue**, chữ trắng.
- Ghost: nền trắng, chữ ink.
- **Pressed:** `translate(4px, 4px)`, shadow `0 0 0` (hiệu ứng nhấn xuống).
- Min height **44px**.

### 4.3. Badges

- Pill, viền đen, nền **FPT Green**, chữ trắng.

### 4.4. Landing navbar (`/login`)

- Trái: logo **APMS** + dải 3 màu FPT.
- Giữa: anchor `Features`, `Materials`, `Progress`, `Reviews` (scroll tới section).
- Phải: **Sign in** (scroll `#hero`) hoặc chip user + **Sign out**.
- Mobile web: nav links cuộn ngang; CTA luôn hiện.

### 4.5. Landing sections (`/login`)

| Section | Mô tả |
|---------|--------|
| Hero | Headline + form đăng nhập 2 cột |
| Catalog preview | 3 card mock tài liệu (Blue / Green / Orange) |
| Progress demo | Thanh tiến độ + stats demo |
| Testimonials | Quote học sinh FPT |
| Enrollment CTA | Card cam + Google sign-in |

## 5. UX Guidelines

- **Accessibility:** Touch target min 44×44px; focus ring 3px ink.
- **Motion:** 150–200ms; `prefers-reduced-motion` tắt transform press.
- **No horizontal scroll** trên mọi breakpoint.

## 6. Implementation

- Web tokens: [`web/app/globals.css`](../web/app/globals.css)
- Web components: `BrutalCard`, `BrutalButton`, `GoogleSignInButton`, `web/components/landing/*`
- Mobile colors: [`mobile/constants/colors.ts`](../mobile/constants/colors.ts)
