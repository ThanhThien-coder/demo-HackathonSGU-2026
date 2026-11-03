// Chọn chế độ suy biến — spec 11 Mục 5 (ENG-51).
import { CONFIG, type DegradedMode } from "@/contracts";
import type { EntryPoint } from "./types";

// ENG-51: Chọn chế độ theo bảng quyết định
export function chooseMode(
  entries: EntryPoint[],
  parsedInScope: number
): DegradedMode | null {
  // 1. Có entry REGISTERED hoặc GENERIC ⇒ NORMAL (null)
  const hasRegisteredOrGeneric = entries.some(
    (e) => e.source === "REGISTERED" || e.source === "GENERIC"
  );
  if (hasRegisteredOrGeneric) {
    return null;
  }

  // 2. Không có entry và n <= CONFIG.PROCEDURAL_MAX_FILES ⇒ PROCEDURAL
  if (parsedInScope <= CONFIG.PROCEDURAL_MAX_FILES) {
    return "PROCEDURAL";
  }

  // 3. Còn lại ⇒ NORMAL (null) (với các entry PROGRAM nếu có; không có entry ⇒ null)
  return null;
}
