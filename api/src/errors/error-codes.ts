import { AppError } from "./AppError";

export const ErrorCode = {
  // Auth
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  AUTH_DISABLED: "AUTH_DISABLED",
  AUTH_EMAIL_DOMAIN: "AUTH_EMAIL_DOMAIN",
  AUTH_ACCESS_CHECK_FAILED: "AUTH_ACCESS_CHECK_FAILED",

  // Generic
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",

  // Drive / documents
  FOLDER_NOT_FOUND: "FOLDER_NOT_FOUND",
  DOCUMENT_NOT_FOUND: "DOCUMENT_NOT_FOUND",
  FOLDER_NAME_EXISTS: "FOLDER_NAME_EXISTS",
  FOLDER_CYCLE: "FOLDER_CYCLE",
  FOLDER_NOT_IN_TRASH: "FOLDER_NOT_IN_TRASH",
  DOCUMENT_NOT_IN_TRASH: "DOCUMENT_NOT_IN_TRASH",
  RESTORE_PARENT_FIRST: "RESTORE_PARENT_FIRST",
  STORAGE_QUOTA: "STORAGE_QUOTA",
  UPLOAD_TOO_LARGE: "UPLOAD_TOO_LARGE",
  UNSUPPORTED_FILE: "UNSUPPORTED_FILE",
  UPLOAD_FAILED: "UPLOAD_FAILED",
  UPLOAD_ALREADY_COMPLETED: "UPLOAD_ALREADY_COMPLETED",

  // Share
  SHARE_NOT_FOUND: "SHARE_NOT_FOUND",
  SHARE_FORBIDDEN: "SHARE_FORBIDDEN",
  SHARE_NO_RECIPIENTS: "SHARE_NO_RECIPIENTS",
  SHARE_RESOURCE_NOT_FOUND: "SHARE_RESOURCE_NOT_FOUND",
  SHARE_INVITE_NOT_FOUND: "SHARE_INVITE_NOT_FOUND",
  SHARE_INVITE_EXPIRED: "SHARE_INVITE_EXPIRED",
  SHARE_INVITE_EMAIL_MISMATCH: "SHARE_INVITE_EMAIL_MISMATCH",

  // Chat
  CHAT_DAILY_LIMIT: "CHAT_DAILY_LIMIT",
  CHAT_QUOTA_GEMINI: "CHAT_QUOTA_GEMINI",
  CHAT_AI_UNAVAILABLE: "CHAT_AI_UNAVAILABLE",
  CHAT_SESSION_NOT_FOUND: "CHAT_SESSION_NOT_FOUND",
  CHAT_ACCESS_DENIED: "CHAT_ACCESS_DENIED",
  CHAT_ANSWER_BLOCKED: "CHAT_ANSWER_BLOCKED",

  // Admin
  USER_NOT_FOUND: "USER_NOT_FOUND",
  CANNOT_DISABLE_SELF: "CANNOT_DISABLE_SELF",
  QUOTA_TOO_LOW: "QUOTA_TOO_LOW",
  MAJOR_NOT_FOUND: "MAJOR_NOT_FOUND",
  SUBJECT_NOT_FOUND: "SUBJECT_NOT_FOUND",
  CURRICULUM_NOT_FOUND: "CURRICULUM_NOT_FOUND",
  CURRICULUM_NOT_ENROLLED: "CURRICULUM_NOT_ENROLLED",
  ACADEMIC_PROFILE_REQUIRED: "ACADEMIC_PROFILE_REQUIRED",
  ACADEMIC_CONFLICT: "ACADEMIC_CONFLICT",
  ACCESS_EMAIL_NOT_FOUND: "ACCESS_EMAIL_NOT_FOUND",
  CANNOT_REVOKE_SELF_ACCESS: "CANNOT_REVOKE_SELF_ACCESS",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ERROR_MESSAGES: Record<ErrorCodeType, string> = {
  AUTH_EMAIL_DOMAIN:
    "Email của bạn chưa được cấp quyền truy cập. Vui lòng đăng nhập bằng email FPT (@fpt.edu.vn hoặc @fe.edu.vn).",
  AUTH_ACCESS_CHECK_FAILED: "Không thể xác minh quyền truy cập email. Vui lòng thử lại sau.",
  MAJOR_NOT_FOUND: "Major not found.",
  SUBJECT_NOT_FOUND: "Subject not found.",
  CURRICULUM_NOT_FOUND: "Curriculum course not found.",
  CURRICULUM_NOT_ENROLLED: "The subject is not in your current major, semester, or selected courses.",
  ACADEMIC_PROFILE_REQUIRED: "Complete your academic profile before uploading documents.",
  ACADEMIC_CONFLICT: "The academic record cannot be changed because it is currently in use.",
  ACCESS_EMAIL_NOT_FOUND: "Access email not found.",
  CANNOT_REVOKE_SELF_ACCESS: "You cannot revoke the email access required by your own account.",
  AUTH_UNAUTHORIZED: "Bạn cần đăng nhập để tiếp tục.",
  AUTH_TOKEN_INVALID: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  AUTH_DISABLED: "Tài khoản của bạn đã bị vô hiệu hóa. Liên hệ quản trị viên.",

  VALIDATION_ERROR: "Dữ liệu không hợp lệ. Vui lòng kiểm tra và thử lại.",
  NOT_FOUND: "Không tìm thấy nội dung yêu cầu.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  CONFLICT: "Thao tác không thể hoàn tất do xung đột dữ liệu.",
  INTERNAL_ERROR: "Đã xảy ra lỗi. Vui lòng thử lại sau.",

  FOLDER_NOT_FOUND: "Không tìm thấy thư mục.",
  DOCUMENT_NOT_FOUND: "Không tìm thấy tài liệu.",
  FOLDER_NAME_EXISTS: "Đã có thư mục cùng tên tại vị trí này.",
  FOLDER_CYCLE: "Không thể di chuyển thư mục vào chính nó hoặc thư mục con.",
  FOLDER_NOT_IN_TRASH: "Thư mục không nằm trong thùng rác.",
  DOCUMENT_NOT_IN_TRASH: "Tài liệu không nằm trong thùng rác.",
  RESTORE_PARENT_FIRST: "Hãy khôi phục thư mục cha trước.",
  STORAGE_QUOTA: "Bạn đã hết dung lượng lưu trữ. Hãy xóa bớt tài liệu hoặc liên hệ quản trị viên.",
  UPLOAD_TOO_LARGE: "Tệp quá lớn. Vui lòng chọn tệp nhỏ hơn.",
  UNSUPPORTED_FILE: "Định dạng tệp không được hỗ trợ. Chỉ chấp nhận PDF, DOCX, PPTX.",
  UPLOAD_FAILED: "Tải lên thất bại. Vui lòng thử lại.",
  UPLOAD_ALREADY_COMPLETED: "Tệp này đã được tải lên trước đó.",

  SHARE_NOT_FOUND: "Không tìm thấy lượt chia sẻ.",
  SHARE_FORBIDDEN: "Bạn không có quyền thu hồi lượt chia sẻ này.",
  SHARE_NO_RECIPIENTS: "Không tìm thấy người nhận hợp lệ để chia sẻ.",
  SHARE_RESOURCE_NOT_FOUND: "Không tìm thấy tài liệu hoặc thư mục để chia sẻ.",
  SHARE_INVITE_NOT_FOUND: "Lời mời không tồn tại hoặc đã bị thu hồi.",
  SHARE_INVITE_EXPIRED: "Lời mời đã hết hạn.",
  SHARE_INVITE_EMAIL_MISMATCH: "Email tài khoản của bạn không khớp với lời mời này.",

  CHAT_DAILY_LIMIT: "Đã hết lượt chat hôm nay. Vui lòng thử lại vào ngày mai.",
  CHAT_QUOTA_GEMINI: "Hệ thống AI tạm thời quá tải. Vui lòng thử lại sau vài phút.",
  CHAT_AI_UNAVAILABLE: "Không thể trả lời ngay lúc này. Vui lòng thử lại sau.",
  CHAT_SESSION_NOT_FOUND: "Không tìm thấy cuộc trò chuyện.",
  CHAT_ACCESS_DENIED: "Bạn không có quyền truy cập nội dung này.",
  CHAT_ANSWER_BLOCKED: "Câu trả lời bị dừng giữa chừng do trùng nội dung bản quyền. Vui lòng thử diễn đạt lại câu hỏi.",

  USER_NOT_FOUND: "Không tìm thấy người dùng.",
  CANNOT_DISABLE_SELF: "Bạn không thể vô hiệu hóa tài khoản của chính mình.",
  QUOTA_TOO_LOW: "Dung lượng mới không thể nhỏ hơn dung lượng đang sử dụng.",
};

export interface CreateAppErrorOptions {
  message?: string;
  technicalDetail?: string;
}

export function createAppError(
  code: ErrorCodeType,
  statusCode: number,
  options?: CreateAppErrorOptions,
): AppError {
  const message = options?.message ?? ERROR_MESSAGES[code];
  const appErrorOptions: { code: ErrorCodeType; technicalDetail?: string } = { code };
  if (options?.technicalDetail !== undefined) {
    appErrorOptions.technicalDetail = options.technicalDetail;
  }
  return new AppError(message, statusCode, appErrorOptions);
}
