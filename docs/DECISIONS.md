# DECISIONS.md — Nhật ký quyết định kiến trúc

> Chỉ log quyết định **có đánh đổi thật sự** — không log style code, không log thay đổi nhỏ, không log thứ đã hiển nhiên khi đọc code.
> Tiêu chí: nếu một dev/agent mới đọc code và tự hỏi *"tại sao làm thế này mà không làm cách hiển nhiên hơn?"* — đó là ứng viên để log.
>
> Format mỗi mục:
> ```
> ### [YYYY-MM-DD hoặc trống nếu suy ra từ code cũ] Tên quyết định
> - Bối cảnh: vấn đề/nhu cầu gì dẫn tới quyết định
> - Quyết định: chọn gì
> - Lý do: vì sao chọn cái này thay vì phương án khác
> - Tham chiếu: file/PR liên quan
> ```

---

## Quyết định đã tồn tại trong code (suy ra được, không bịa)

### [ ] Unified document API thay `/api/drive`, `/api/library`, `/api/forum`
- Bối cảnh: Trước đây tài liệu bị tách theo nhiều surface route riêng.
- Quyết định: Gỡ hẳn 3 route cũ khỏi mount, chỉ còn `GET /api/documents` với tham số `view=my|shared|public|starred|trash`.
- Lý do: Một entrypoint duy nhất cho mọi view giúp phân quyền/filter/sort nhất quán, tránh trùng lặp logic list ở nhiều route. AGENTS.md cấm thêm compatibility wrapper cho các route cũ.
- Tham chiếu: `api/src/routes/index.ts`, `PROJECT.md`, root `AGENTS.md` (Core invariants)

### [ ] Web giữ `drive` / `library` / `forum` làm tên UI route dù API đã hợp nhất
- Bối cảnh: API hợp nhất nhưng UI vẫn cần các surface trực quan khác nhau cho user.
- Quyết định: Giữ tên route/URL cũ ở tầng web như một lớp đặt tên UI riêng, map sang tham số của API thống nhất (vd `library` -> tab `browse`, `forum` -> tab `suggested`).
- Lý do: Giữ URL/UX quen thuộc cho người dùng mà không cần khôi phục route API cũ. Đây là điểm dễ nhầm: tên thư mục web KHÔNG phản ánh route API.
- Tham chiếu: `web/app/(app)/library/page.tsx` (`parseTab`), `web/app/(app)/forum/`, `web/app/(app)/drive/`

### [ ] Layering backend nghiêm ngặt `Router -> Controller -> Service -> Model`
- Bối cảnh: Cần chỗ đặt business rule rõ ràng, tránh logic rò rỉ vào controller/route.
- Quyết định: Router chỉ wire + validate (Zod), Controller chỉ orchestrate, Service chứa toàn bộ business rule + side effect, Model là schema + mapper. Zod validator là input contract.
- Lý do: Tách bạch để business rule tập trung một chỗ, dễ audit theo FR/BR; đổi validator = đổi input nghiệp vụ.
- Tham chiếu: `api/AGENTS.md`

### [ ] AI provider abstraction — facade mỏng quanh Gemini
- Bối cảnh: Toàn hệ thống phụ thuộc Vertex AI Gemini cho embedding/chat/vision.
- Quyết định: `services/ai/ai.service.ts` là facade chỉ delegate sang `gemini.provider.ts`; các service khác import qua facade, không gọi thẳng provider.
- Lý do: Cô lập dependency nhà cung cấp AI vào một điểm để dễ thay thế/mở rộng mà không sửa rải rác nhiều service.
- Tham chiếu: `api/src/services/ai/ai.service.ts`, `gemini.provider.ts`

### [ ] Soft-archive catalog + soft-delete document, kèm referential-integrity guards
- Bối cảnh: Catalog học vụ và tài liệu bị nhiều thực thể tham chiếu chéo.
- Quyết định: Không hard delete — catalog dùng `isActive`, document dùng `deletedAt` (trash purge sau 30 ngày). Guards trong `academic.service.ts` chặn deactivate/đổi identity khi còn bị tham chiếu.
- Lý do: Bảo toàn referential integrity và lịch sử; tránh dữ liệu mồ côi (BR-017..021).
- Tham chiếu: `api/src/services/academic.service.ts`, `api/AGENTS.md`, `docs/SRS.md`

### [ ] Axios request interceptor gắn Cognito idToken cho mọi call
- Bối cảnh: Mọi request web tới API cần Bearer JWT của Cognito.
- Quyết định: Một axios instance với `interceptors.request` lấy `fetchAuthSession()` và gắn `Authorization` tự động.
- Lý do: Tránh phải wire token thủ công ở từng call; token luôn tươi theo session.
- Tham chiếu: `web/lib/api-client.ts`

### [ ] Business limits đọc từ validated env tập trung
- Bối cảnh: Các giới hạn nghiệp vụ (upload size, chat/ngày, trash retention, presign TTL, email allowlist) cần nhất quán và kiểm soát được.
- Quyết định: Tất cả đọc qua `config/env.ts` đã validate; đổi default coi như đổi nghiệp vụ và phải cập nhật `docs/SRS.md` + `docs/api_reference.md`.
- Lý do: Một nguồn cấu hình, khớp với SRS, tránh hardcode rải rác.
- Tham chiếu: `api/src/config/env.ts`, `api/AGENTS.md`

---

## Quyết định mới (thêm khi có đánh đổi thật trong lúc làm task)

<!-- Thêm mục mới ở đây theo format phía trên -->
