# CLAUDE.md — APMS Project Instructions

## Đọc trước khi làm bất kỳ task nào

Luôn đọc `PROJECT.md` ở root trước khi bắt đầu task để có context đầy đủ về dự án.

## Quy tắc bổ sung cho project này

- Backend: Express 5, Zod validator, pattern Controller → Service → Model
- Web: Next.js 16 + React 19 + Tailwind v4 (có breaking changes — đọc `web/AGENTS.md`)
- Mobile: Expo 54 + NativeWind (Tailwind v3 bên dưới, KHÔNG phải v4)
- Design system: Neo-brutalism, dùng token `brutal-*` (web) và `colors.*` (mobile)
- Không hardcode hex color, dùng token đã định nghĩa
- API response luôn theo format: `{ status: "success", data: {...} }` hoặc `{ status: "error", message: "..." }`
