> Chuyển nguyên văn từ spec/00_QUYET_DINH.md ngày 29/10/2026. Không còn là căn cứ.

## 4. Đối chiếu danh sách "CẤN" của 03_VI_DU

| # | Trạng thái | Xử lý ở |
| :-: | :-- | :-- |
| 1 | Chốt (D-03) | `21` Mục regex |
| 2 | Giải bằng D-14 + D-15 + `getOrRebuildStaticResult` | `03` |
| 3 | Giải: contract đủ request/response mọi endpoint | `02` |
| 4 | Ôn node đỏ = run `REMEDIATION` | `22`, `03` |
| 5 | Ôn khi phai = run `DECAY_REVIEW`, không đổi màu node | `22`, `03` |
| 6 | Chốt (D-03) | `20`, `21` |
| 7 | Chốt: từ cấm quét cả `reference_answer`, `must_have_points`, `fix` | `21` |
| 8 | Chốt: server xóa `misconception`; server trả về theo **danh sách trường cho phép** | `03` |
| 9 | Chốt (D-03) | `03`, `20` |
| 10 | Giải: mỗi câu đúng 1 `skill` | `02` |
| 11 | Chốt: nhặt tên trong dấu `` ` `` ở mọi đoạn chữ | `21` |
| 12 | Chốt | `02` |
| 13 | Chốt (D-01) | `20`, `30` |
| 14 | Giữ "QUY TẮC FEEDBACK" | `20` |
| 15, 17, 19–25 | Chốt (D-03, D-13, D-22) | `20`, `21`, `22`, `30` |
| 16, 18 | Không còn (bỏ `hidden_challenge`) | — |
| 26 | Chốt: 4 góc `FLOW` / `ARCHITECTURE` / `WEAKNESS` / `CHANGE` | `22` |
| 27 | Đặc tả, bật bằng cờ `CONFIG.NOVICE_SECOND_QUESTION` (mặc định `false`) | `22` |
| 28 | Đặc tả, bật bằng cờ `CONFIG.GAP_TARGETING` (mặc định `false`) | `22` |

---

## 5. Tóm tắt audit 28/10 (vì sao phải hợp nhất)

Audit đọc từng dòng 19 file tài liệu cũ (≈ 825 KB). Ba nhóm lỗi chính, đều đã xử lý trong `spec/`:

1. **Ba thiết kế chấm điểm / BKT cùng tồn tại** (v1.1 server-side; thang gợi ý cho client tự tính BKT; thiết kế 03_VI_DU) và **hai lược đồ DB** (`04_LUU_TRU` vs `02_BAYES §5` có ghi chú "lưu localStorage"). ⇒ D-01, D-02, D-15, D-16.
2. **Engine thiếu định nghĩa cốt lõi:** node dựng từ file Hub (trái bất biến), không có luật `node.id` và cạnh, 7 trường contract không có thuật toán sinh, engine không tất định, PageRank bầu Repository làm Hub. ⇒ D-06 … D-12.
3. **Luồng gãy & lỗ hổng:** ôn node đã xanh bị chặn, "ôn lại" khóa ngược node con, viền cam bật ngay sau khi đạt, gọi AI trước khi kiểm trạng thái, khóa dòng chưa tồn tại, token không có hạn và không gắn phiên, sync receipt không chạy được khi DB sập, prompt chấm không nhận câu hỏi, câu dự phòng AST không chấm được, gác tên tin danh sách do AI tự khai, từ cấm so chuỗi con. ⇒ D-13, D-14, D-17, D-18, D-19, D-23 và D-03.

Ngoài ra: số liệu trôi giữa các file (quota 10k / 50k / 80k; Fast-Track 0.85 / 0.92; 3 nơi dùng công thức decay cũ; temperature 0 / 0.1 / 0.2) ⇒ gom về **một bảng `CONFIG`** trong `02_CONTRACTS.md`. Lỗi tính toán đã sửa: bảng "Case 4" của BKT cũ (chuỗi đúng, tính không làm tròn giữa chừng: 0.25 → 0.4202 → 0.5957 → 0.7439 → 0.8495), Trace C của 03_VI_DU bỏ qua node tiên quyết.
