export { ERROR_MESSAGES, formatErrorMessage } from "@/lib/messages";
import { ERROR_MESSAGES } from "@/lib/messages";

export function getErrorMessage(
  code?: string,
  fallback = "Đã có lỗi xảy ra. Vui lòng thử lại sau."
): string {
  if (!code) return fallback;
  return (ERROR_MESSAGES as Record<string, string>)[code] || fallback;
}
