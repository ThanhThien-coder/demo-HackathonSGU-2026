> Chuyển nguyên văn từ spec/21_AI_KIEM_VA_DUYET.md ngày 29/10/2026. Không còn là căn cứ.

## Chỉ mục: edge case cũ & mục cũ của `00` Mục 4 → luật

| Cũ (`archive/…/03_SYSTEM_EDGE_CASES_AUDIT.md`) | Nay |
| :-- | :-- |
| 1.20 secret gửi Gemini · 1.21 lệnh nhúng trong code | `10` che secret; `20` AI-04, AI-16 · `20` AI-13, AI-14 `<warning>` |
| 2.1 rate limit GitHub | Không thuộc AI (`10`) |
| 2.2 mất mạng | Chế độ Offline (`03` Mục 7) + GUARD-19 |
| 2.3 Gemini 429 / 503 | `20` AI-12 (chờ `LLM_RETRY_DELAY_MS`, gọi lại 1 lần); bỏ "Fallback Bank" và câu AST (D-03 #6) |
| 2.4 cold start | Bỏ prefetch (D-03 #22); Tab 1 có sẵn từ phân tích; UI chờ (`30`) |
| 3.1 bấm nộp liên tục | GUARD-16 debounce + `ERR_ATTEMPT_OUT_OF_SYNC` (thay kiểm hash 3 s) |
| 3.2 prompt injection | `20` AI-03, AI-13, AI-30 (server quyết Đạt); GUARD-15 |
| 3.3 · 3.4 · 3.5 rác / quá dài / thử-sai | GUARD-16 (bỏ kiểm entropy, bỏ `maxLength = 500` và cắt chuỗi); giới hạn lượt `01` Mục 7 |
| 3.6 không dấu, teencode · 3.7 chép định nghĩa | `20` AI-28 |
| 5.1 JSON hỏng | `20` AI-02, AI-12, AI-36; không có câu AST (INV-08) |
| 5.2 lệch kiểu đặt tên | GUARD-02 `norm`, GUARD-04 |
| 5.3 từ cấm chặn nhầm gói | GUARD-06, GUARD-07 (thay `.includes`) |
| 5.4 code quá chuẩn | `20` AI-16 mục 5 (không bịa điểm dở); góc `FLOW` / `ARCHITECTURE` / `CHANGE` (`20` AI-25) |
| 6.1 thang gợi ý | `20` AI-31, AI-32 (nấc 1 `CONCEPT`, nấc 2 `CODE_POINTER`, nấc 3 đáp án) |
| 6.2 node đỏ | `30`; `03` Mục 6.3 |
| 8.1 · 8.3 · 8.4 · 8.5 · 8.6 | `20` AI-28, AI-30 (ý bắt buộc + trích dẫn); 8.3 thêm GUARD-16; 8.6: từ cấm không quét câu trả lời (GUARD-07) |
| 8.2 nản, bỏ cuộc | `GIVE_UP` (`20` AI-28, AI-31); "Bỏ qua câu này" ⇒ `FAILED` + BKT (D-03 #15, thay "không tạo quan sát BKT") |

| Mục cũ (`00` Mục 4) | Luật |
| :-- | :-- |
| #1 | GUARD-15 |
| #6 · #9 | `20` AI-22, AI-36 · `20` AI-27, AI-36 |
| #7 | GUARD-12 Q5 |
| #8 | `20` AI-10, AI-34 |
| #11 · #21 | GUARD-04 (+ GUARD-12 Q6; `fix` chỉ kiểm từ cấm) |
| #14 | `20` AI-28 (feedback) |
| #17 | Chấp nhận cache dùng chung; biến thể `|v{n}` (`20` AI-22) |
| #20 | `20` AI-15, AI-36 |
| #22 | `20` AI-01 |
| #23 | GUARD-10 A3 |
| #24 | GUARD-06, GUARD-07 |
| #25a, c · #25b · #25d | GUARD-18 – 20 · GUARD-17 · `20` AI-30 |
| #26 | `20` AI-23, AI-25; GUARD-12 Q6–Q8 |
