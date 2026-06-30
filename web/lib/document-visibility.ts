export const PUBLISH_TO_LIBRARY_CONFIRM_TITLE = "Đăng lên thư viện?";

export const PUBLISH_TO_LIBRARY_CONFIRM_DESCRIPTION =
  "Tài liệu sẽ xuất hiện trên Thư viện công khai cho mọi sinh viên đã đăng nhập. Bạn vẫn giữ quyền sở hữu trên Drive và có thể thu hồi bất cứ lúc nào. Đây khác với Chia sẻ — chỉ gửi cho người bạn chọn.";

export const PUBLISH_TO_LIBRARY_PENDING_HINT =
  "Tài liệu đang xử lý — sau khi Sẵn sàng, tài liệu công khai mới xuất hiện trên Thư viện.";

export function isPublishingToLibrary(
  current: "private" | "public" | undefined,
  next: "private" | "public",
): boolean {
  return current !== "public" && next === "public";
}
