import { isAxiosError } from "axios";

/** Mirrors api/src/errors/error-codes.ts — user-facing Vietnamese messages */
export const ErrorCode = {
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  AUTH_DISABLED: "AUTH_DISABLED",
  AUTH_EMAIL_DOMAIN: "AUTH_EMAIL_DOMAIN",
  AUTH_ACCESS_CHECK_FAILED: "AUTH_ACCESS_CHECK_FAILED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
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
  SHARE_NOT_FOUND: "SHARE_NOT_FOUND",
  SHARE_FORBIDDEN: "SHARE_FORBIDDEN",
  SHARE_NO_RECIPIENTS: "SHARE_NO_RECIPIENTS",
  SHARE_RESOURCE_NOT_FOUND: "SHARE_RESOURCE_NOT_FOUND",
  SHARE_INVITE_NOT_FOUND: "SHARE_INVITE_NOT_FOUND",
  SHARE_INVITE_EXPIRED: "SHARE_INVITE_EXPIRED",
  SHARE_INVITE_EMAIL_MISMATCH: "SHARE_INVITE_EMAIL_MISMATCH",
  CHAT_DAILY_LIMIT: "CHAT_DAILY_LIMIT",
  CHAT_QUOTA_BEDROCK: "CHAT_QUOTA_BEDROCK",
  CHAT_QUOTA_GEMINI: "CHAT_QUOTA_GEMINI",
  CHAT_AI_UNAVAILABLE: "CHAT_AI_UNAVAILABLE",
  CHAT_SESSION_NOT_FOUND: "CHAT_SESSION_NOT_FOUND",
  CHAT_ACCESS_DENIED: "CHAT_ACCESS_DENIED",
  CHAT_ANSWER_BLOCKED: "CHAT_ANSWER_BLOCKED",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  CANNOT_DISABLE_SELF: "CANNOT_DISABLE_SELF",
  CANNOT_DEMOTE_SELF: "CANNOT_DEMOTE_SELF",
  CANNOT_DEMOTE_LAST_ADMIN: "CANNOT_DEMOTE_LAST_ADMIN",
  COGNITO_GROUP_UPDATE_FAILED: "COGNITO_GROUP_UPDATE_FAILED",
  QUOTA_TOO_LOW: "QUOTA_TOO_LOW",
  ACADEMIC_CONFLICT: "ACADEMIC_CONFLICT",
  ACCESS_EMAIL_NOT_FOUND: "ACCESS_EMAIL_NOT_FOUND",
  CANNOT_REVOKE_SELF_ACCESS: "CANNOT_REVOKE_SELF_ACCESS",
  CURRICULUM_NOT_FOUND: "CURRICULUM_NOT_FOUND",
  SUBJECT_NOT_FOUND: "SUBJECT_NOT_FOUND",
  SEMESTER_NOT_FOUND: "SEMESTER_NOT_FOUND",
  CURRICULUM_SEMESTER_NOT_FOUND: "CURRICULUM_SEMESTER_NOT_FOUND",
  COURSE_SLOT_NOT_FOUND: "COURSE_SLOT_NOT_FOUND",
  ACADEMIC_PROFILE_REQUIRED: "ACADEMIC_PROFILE_REQUIRED",
  COURSE_SLOT_NOT_IN_PROFILE: "COURSE_SLOT_NOT_IN_PROFILE",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

const ERROR_MESSAGES: Record<ErrorCodeType, string> = {
  AUTH_UNAUTHORIZED: "Bạn cần đăng nhập để tiếp tục.",
  AUTH_TOKEN_INVALID: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  AUTH_DISABLED: "Tài khoản của bạn đã bị vô hiệu hóa. Liên hệ quản trị viên.",
  AUTH_EMAIL_DOMAIN:
    "Email của bạn chưa được cấp quyền truy cập hệ thống nội bộ. Hãy dùng email @fpt.edu.vn/@fe.edu.vn, hoặc liên hệ quản trị viên để được cấp quyền truy cập ngoại lệ.",
  AUTH_ACCESS_CHECK_FAILED: "Không thể xác minh quyền truy cập email. Vui lòng thử lại sau.",
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
  CHAT_QUOTA_BEDROCK: "Hệ thống AI tạm thời quá tải. Vui lòng thử lại sau vài phút.",
  CHAT_QUOTA_GEMINI: "Hệ thống AI tạm thời quá tải. Vui lòng thử lại sau vài phút.",
  CHAT_AI_UNAVAILABLE: "Không thể trả lời ngay lúc này. Vui lòng thử lại sau.",
  CHAT_SESSION_NOT_FOUND: "Không tìm thấy cuộc trò chuyện.",
  CHAT_ACCESS_DENIED: "Bạn không có quyền truy cập nội dung này.",
  CHAT_ANSWER_BLOCKED: "Câu trả lời bị dừng giữa chừng do trùng nội dung bản quyền. Vui lòng thử diễn đạt lại câu hỏi.",
  USER_NOT_FOUND: "Không tìm thấy người dùng.",
  CANNOT_DISABLE_SELF: "Bạn không thể vô hiệu hóa tài khoản của chính mình.",
  CANNOT_DEMOTE_SELF: "Bạn không thể thu hồi quyền quản trị của chính mình.",
  CANNOT_DEMOTE_LAST_ADMIN: "Không thể thu hồi quyền quản trị của admin cuối cùng.",
  COGNITO_GROUP_UPDATE_FAILED: "Không thể cập nhật nhóm quản trị trên Cognito. Vui lòng thử lại.",
  QUOTA_TOO_LOW: "Dung lượng mới không thể nhỏ hơn dung lượng đang sử dụng.",
  ACADEMIC_CONFLICT:
    "Không thể thay đổi vì bản ghi đang được sinh viên hoặc tài liệu sử dụng.",
  ACCESS_EMAIL_NOT_FOUND: "Không tìm thấy email truy cập.",
  CANNOT_REVOKE_SELF_ACCESS:
    "Bạn không thể thu hồi quyền truy cập của chính email mình.",
  CURRICULUM_NOT_FOUND: "Không tìm thấy chương trình đào tạo.",
  SUBJECT_NOT_FOUND: "Không tìm thấy môn học.",
  SEMESTER_NOT_FOUND: "Không tìm thấy học kỳ.",
  CURRICULUM_SEMESTER_NOT_FOUND: "Học kỳ chưa được gán cho CTĐT này.",
  COURSE_SLOT_NOT_FOUND: "Không tìm thấy môn trong CTĐT.",
  ACADEMIC_PROFILE_REQUIRED:
    "Hoàn thành hồ sơ học thuật trước khi tải lên tài liệu.",
  COURSE_SLOT_NOT_IN_PROFILE:
    "Môn học không thuộc CTĐT, học kỳ hoặc danh sách môn đã chọn của bạn.",
};

const DEFAULT_MESSAGE = "Đã xảy ra lỗi. Vui lòng thử lại.";
const NETWORK_MESSAGE =
  "Không thể kết nối máy chủ. Kiểm tra kết nối mạng và thử lại.";

/** Shown when the deployed API lacks POST .../messages/stream (Express 404 HTML). */
export const CHAT_STREAM_NOT_AVAILABLE_MESSAGE =
  "Tính năng chat AI (streaming) chưa được bật trên máy chủ. Vui lòng liên hệ team backend để deploy API mới nhất.";

const HTTP_FALLBACK: Record<number, string> = {
  401: ERROR_MESSAGES.AUTH_UNAUTHORIZED,
  403: ERROR_MESSAGES.FORBIDDEN,
  404: ERROR_MESSAGES.NOT_FOUND,
  409: ERROR_MESSAGES.CONFLICT,
  429: ERROR_MESSAGES.CHAT_QUOTA_BEDROCK,
  500: ERROR_MESSAGES.INTERNAL_ERROR,
  503: ERROR_MESSAGES.CHAT_AI_UNAVAILABLE,
};

interface ApiErrorBody {
  code?: string;
  message?: string;
}

function isErrorCode(value: string): value is ErrorCodeType {
  return value in ERROR_MESSAGES;
}

function extractApiBody(err: unknown): ApiErrorBody | null {
  if (!isAxiosError(err)) return null;
  const data = err.response?.data;
  if (!data || typeof data !== "object") return null;
  return data as ApiErrorBody;
}

/** Extract API error `code` (if any) for conditional UI. */
export function getUserErrorCode(err: unknown): string | null {
  const body = extractApiBody(err);
  return typeof body?.code === "string" && body.code.length > 0 ? body.code : null;
}

function isHtmlOrExpressErrorBody(body: string): boolean {
  const trimmed = body.trim();
  return (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    /Cannot (GET|POST|PUT|PATCH|DELETE) /i.test(trimmed)
  );
}

function sanitizePlainErrorMessage(message: string): string {
  if (!isHtmlOrExpressErrorBody(message)) {
    return message;
  }
  if (
    /messages\/stream/i.test(message) ||
    /Cannot POST/i.test(message)
  ) {
    return CHAT_STREAM_NOT_AVAILABLE_MESSAGE;
  }
  return DEFAULT_MESSAGE;
}

/** Map fetch response body + status to a user-facing Vietnamese message. */
export function parseFetchErrorBody(status: number, body: string): string {
  const trimmed = body.trim();

  if (trimmed) {
    try {
      const json = JSON.parse(trimmed) as {
        code?: string;
        message?: string;
      };
      if (json.code && isErrorCode(json.code)) {
        return ERROR_MESSAGES[json.code];
      }
      if (typeof json.message === "string" && json.message.length > 0) {
        return json.message;
      }
    } catch {
      // not JSON — fall through
    }
  }

  if (
    status === 404 &&
    (isHtmlOrExpressErrorBody(trimmed) || /messages\/stream/i.test(trimmed))
  ) {
    return CHAT_STREAM_NOT_AVAILABLE_MESSAGE;
  }

  if (isHtmlOrExpressErrorBody(trimmed)) {
    return HTTP_FALLBACK[status] ?? DEFAULT_MESSAGE;
  }

  if (trimmed.length > 0 && trimmed.length < 500) {
    return trimmed;
  }

  return HTTP_FALLBACK[status] ?? DEFAULT_MESSAGE;
}

/** Resolve a user-friendly Vietnamese message from an API or network error. */
export function getUserErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    if (!err.response) {
      return NETWORK_MESSAGE;
    }

    const body = extractApiBody(err);
    const code = body?.code;
    const serverMessage = body?.message;

    if (code && isErrorCode(code)) {
      return ERROR_MESSAGES[code];
    }

    if (typeof serverMessage === "string" && serverMessage.length > 0) {
      return serverMessage;
    }

    const status = err.response.status;
    return HTTP_FALLBACK[status] ?? DEFAULT_MESSAGE;
  }

  if (err instanceof Error && err.message.length > 0) {
    return sanitizePlainErrorMessage(err.message);
  }

  return DEFAULT_MESSAGE;
}

/** @deprecated Use getUserErrorMessage */
export const getApiErrorMessage = getUserErrorMessage;
