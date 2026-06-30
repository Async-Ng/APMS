# Coding Standards

## Nguyên Tắc Chung

- Dùng TypeScript strict, hạn chế `any` và unsafe assertion.
- Giữ kiến trúc backend theo luồng `Router -> Controller -> Service -> Model`.
- Validate mọi input từ bên ngoài bằng Zod.
- Business rule đặt trong service, không đặt trong route.
- API response nên nhất quán, dễ consume bởi web/mobile.

## Backend

- Routes đặt trong `api/src/routes`.
- Controllers đặt trong `api/src/controllers`.
- Services đặt trong `api/src/services`.
- Models đặt trong `api/src/models`.
- Validators đặt trong `api/src/validators`.
- OpenAPI schemas đặt trong `api/src/openapi`.

Document APIs phải dùng surface thống nhất `/api/documents`. Không thêm lại `/api/drive`, `/api/library`, hoặc `/api/forum`.

Document upload/update rules:

- Upload mới bắt buộc có `courseSlotId`.
- `visibility` chỉ là `private | public`.
- Default upload visibility là `private`.
- Không cho update `courseSlotId` về `null`.
- Chỉ owner được mutate title, tags, folder, course, visibility, delete, restore, star.

## Search / Chat / AI

- Embeddings dùng Vertex AI `gemini-embedding-001`.
- Dimension mặc định là `1024`, lấy từ `GEMINI_EMBEDDING_OUTPUT_DIMENSION`.
- Vector lưu vào MongoDB Atlas Vector Search phải đúng dimension với index.
- Embedding nên được normalize khi output dimension thấp hơn full model dimension, theo helper hiện có.
- Search/chat access phải dùng cùng rule đọc document: owner, shared recipient, hoặc active user với public document.
- Không đưa private content vào public search/chat scope.

## Web

- Next.js App Router, React 19, Tailwind CSS 4.
- Server state dùng TanStack Query.
- Shared client state dùng Zustand khi thật sự cần chia sẻ giữa nhiều màn.
- Giữ design language hiện tại, không tự ý đổi UI pattern khi chỉ sửa API/docs.

## Mobile

- Expo Router, React Native 0.81, NativeWind.
- Gọi API qua helper chung trong `mobile/lib`.
- Tránh hard-code route đã bị gỡ; các màn tài liệu cần migrate sang `/api/documents` trong phase client.

## Documentation

- Khi đổi endpoint, cập nhật `docs/api_reference.md`.
- Khi đổi schema/index/visibility, cập nhật `docs/database_design.md`.
- Khi đổi AI provider/model/dimension, cập nhật `README.md`, `docs/system_overview.md`, và vector-index notes.
