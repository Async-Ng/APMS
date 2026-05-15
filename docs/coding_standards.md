# Tiêu chuẩn và Ràng buộc Lập trình (Coding Standards & Best Practices)

Tài liệu này quy định các nguyên tắc, ràng buộc và best practices khi viết code cho dự án APMS. Tất cả lập trình viên cần tuân thủ nghiêm ngặt để đảm bảo mã nguồn dễ bảo trì, an toàn và tối ưu hiệu năng.

## 1. Nguyên tắc chung (General Principles)

- **DRY (Don't Repeat Yourself):** Hạn chế lặp code. Tách các logic dùng chung thành các helper/utility functions.
- **KISS (Keep It Simple, Stupid):** Viết code đơn giản, dễ hiểu thay vì cố gắng dùng các thủ thuật phức tạp (clever code).
- **Clean Code:** Đặt tên biến/hàm/class có ý nghĩa rõ ràng. Tên hàm phải bắt đầu bằng động từ (vd: `getUser`, `calculateTotal`).
- **Lưu đồ kiến trúc:** Tuân thủ kiến trúc phân lớp: `Router -> Controller -> Service -> Model`. Controller chỉ parse request/response, logic nghiệp vụ bắt buộc phải nằm ở Service.

## 2. TypeScript Best Practices

- **Strict Mode:** Luôn bật `"strict": true` trong `tsconfig.json`.
- **Định danh kiểu rõ ràng (Explicit Typing):** Tuyệt đối không sử dụng type `any`. Bắt buộc phải định nghĩa type rõ ràng, minh bạch cho mọi biến, tham số và giá trị trả về.
- **Nghiêm cấm ép kiểu nguy hiểm (No Type Assertion Abuse):** Tuyệt đối cấm các hành vi ép kiểu (type casting) như `as any as Type`, `as unknown as Type`, hoặc `as any` để "lách luật" trình biên dịch. Nếu TypeScript báo lỗi, phải định nghĩa đúng Interface/Type gốc để xử lý triệt để, không được lấp liếm lỗi.
- **Interfaces vs Types:** Ưu tiên dùng `interface` cho định nghĩa Object/Model. Dùng `type` cho union types hoặc utility types.
- **Optional Chaining & Nullish Coalescing:** Sử dụng `?.` và `??` thay vì kiểm tra `&&` hoặc `||` dài dòng để xử lý giá trị undefined/null.

## 3. Backend (Node.js & Express.js)

- **Async/Await & Lỗi (Error Handling):** 
  - Tuyệt đối không dùng callback, luôn dùng `async/await`.
  - Phải có một hàm Middleware chặn lỗi ở cuối cùng (`globalErrorHandler`).
  - Sử dụng block `try...catch` cẩn thận hoặc dùng wrapper `catchAsync` để tự động đẩy lỗi về global error handler mà không cần viết lại `try...catch` ở mọi controller.
- **Validation:** Không tin tưởng dữ liệu từ client. Mọi request body/params/query đều phải được validate (Khuyên dùng thư viện `Zod` hoặc `Joi`).
- **RESTful API:** Tuân thủ chuẩn REST. 
  - Dùng đúng HTTP Methods: `GET`, `POST`, `PUT/PATCH`, `DELETE`.
  - Định dạng JSON Response chuẩn: `{ "status": "success", "data": {...} }` hoặc `{ "status": "error", "message": "..." }`.
- **Environment Variables:** Không bao giờ hardcode credentials. Sử dụng `dotenv` và có schema xác thực các biến môi trường lúc khởi động app.

## 4. Frontend (React & Next.js)

- **App Router (Next.js):** 
  - Phân tách rõ ràng giữa **Server Components** (dùng cho fetch data, render tĩnh) và **Client Components** (chỉ dùng khi cần state, effect hoặc event listener - thêm `'use client'`).
- **Hooks:**
  - Không được bỏ qua cảnh báo của `eslint-plugin-react-hooks`. Luôn cung cấp đủ dependencies cho `useEffect`, `useCallback`, `useMemo`.
  - Tránh lạm dụng `useEffect`. Nếu một state có thể được tính toán từ props hoặc state khác, hãy tính trực tiếp trong quá trình render.
- **State Management & Data Fetching:**
  - **Server State (API Data):** Bắt buộc sử dụng **TanStack Query (React Query)** để gọi API, quản lý cache, loading state và error handling. Không dùng `useEffect` kết hợp `useState` để fetch data.
  - **Client Global State:** Chỉ dùng `Zustand` khi dữ liệu thực sự cần share qua nhiều component không liên quan (vd: UI Theme, trạng thái Sidebar).
  - Dùng state cục bộ (`useState`) cho các logic UI đơn giản (vd: đóng mở modal).
- **Component Design:**
  - Giữ component nhỏ gọn (dưới 200 dòng). Tách thành các component con nếu file quá dài.
  - Dùng destructuring cho props: `function Button({ title, onClick }: ButtonProps)` thay vì `props.title`.

## 5. Mobile (React Native & Expo)

- **Framework:** Ưu tiên sử dụng **Expo** (Managed workflow) thay vì React Native CLI nguyên bản để tối ưu việc cài đặt thư viện và build app (Expo Go, EAS Build).
- **Navigation:** Sử dụng **Expo Router** (dựa trên React Navigation) để đồng bộ tư duy routing theo file/folder tương tự như Next.js App Router.
- **UI Components:** 
  - Khuyến nghị sử dụng **NativeWind** (Tailwind CSS cho React Native) để tái sử dụng tối đa Design System từ phiên bản Web.
  - Sử dụng các component native chuẩn như `SafeAreaView`, `KeyboardAvoidingView` để đảm bảo UI hiển thị tốt trên các dòng máy khác nhau (có tai thỏ, viền dưới, bàn phím ảo).
  - Tối ưu danh sách dài với `FlatList` hoặc `FlashList` (từ Shopify), tuyệt đối không dùng `ScrollView` với hàm `map` cho list dữ liệu lớn.
- **State & Data Fetching:** Giữ nguyên quy tắc dùng **TanStack Query** cho API và **Zustand** cho Client State, vì 2 thư viện này hoạt động xuất sắc trên cả Web và Mobile.
- **Hiệu năng & Animation:** Sử dụng thư viện **React Native Reanimated** thay cho Animated API mặc định để đảm bảo animation chạy mượt mà ở 60fps trên UI thread (Ví dụ áp dụng cho các hiệu ứng Spring Physics của phong cách Claymorphism).

## 6. CSS & Styling (Tailwind CSS)

- **Utility-First:** Sử dụng triệt để class của Tailwind. Tránh viết custom CSS trong file `.css` ngoài trừ trường hợp các hiệu ứng phức tạp (như Claymorphism shadow) nên được khai báo trong layer `components` hoặc biến trong `tailwind.config.ts`.
- **Sắp xếp Class:** Nên sử dụng plugin `prettier-plugin-tailwindcss` để tự động sắp xếp (sort) các class theo thứ tự chuẩn.
- **Responsive:** Tuân thủ Mobile-first. Bắt đầu với màn hình nhỏ, sau đó thêm prefix `md:`, `lg:` cho màn hình lớn.
- **Tính nhất quán (Consistency):** Chỉ sử dụng bảng màu và spacing đã quy định trong **UI Design System**.

## 7. Cơ sở dữ liệu (MongoDB)

- **Mongoose Schema:** Khai báo rõ ràng các fields, kiểu dữ liệu, `required`, và `default`.
- **Indexing:** Đánh index cho các trường thường xuyên được truy vấn (như `userId`, `email`) để tăng tốc độ độ đọc.
- **Soft Delete:** Không xóa cứng (hard delete) dữ liệu quan trọng. Sử dụng trường `isDeleted` hoặc thư viện `mongoose-delete` để xóa mềm.
- **Vector Search:** Đảm bảo dữ liệu embedding (Titan) được chuẩn hóa độ dài trước khi lưu vào Vector Index để đảm bảo hiệu suất tính toán độ tương đồng (Cosine similarity).
