# TASK 01 — Đồng bộ tham số BKT mới & luật chấm "ẩn dụ là điểm cộng"

> **Model gợi ý:** Claude Sonnet 4.6 · mức **medium**. Việc đồng bộ theo khuôn, không cần Opus.
> **Chỉ sửa Markdown.** Không tạo file mới, không sửa code HTML, không commit.

## 1. Nguồn sự thật (ĐÃ sửa xong, KHÔNG sửa lại các file này)
- `02_AI_VA_BAYES/02_BAYES_COGNITIVE_BKT.md` (Mục 2.1, 2.2, 2.3)
- `02_AI_VA_BAYES/01_LLM_PIPELINE_GUARDRAIL.md` (Mục 4.2)
- `00_CORE_SPEC/02_DATA_CONTRACTS.md` (`FeynmanEvaluationResult`)

Đọc 3 file trên trước, rồi đồng bộ các file ở Mục 3 cho khớp.

## 2. Hai thay đổi cần đồng bộ

### 2.1. Tham số BKT mới
| Tham số | Cũ | **Mới** |
| :--- | :---: | :---: |
| $P(L_0)$ | 0.25 (một số file ghi nhầm 0.20) | **0.25** |
| $P(T \mid \text{Correct})$ | 0.20 | **0.08** |
| $P(T \mid \text{Incorrect})$ | 0.02 | **0.03** |
| $P(G)$ | 0.15 | **0.25** |
| $P(S)$ | 0.05 | **0.12** |

Kết quả tính chuẩn (dùng đúng các số này, không tự tính khác):
- Đúng 1 lần từ 0.25: hậu nghiệm $0.2200/0.4075 \approx 0.5399$ → $P(L_1) = \mathbf{0.5767}$ (Tier 2)
- Sai 1 lần từ 0.25: hậu nghiệm $0.0300/0.5925 \approx 0.0506$ → $P(L_1) = \mathbf{0.0791}$
- Đúng liên tiếp: $0.25 \to 0.5767 \to 0.8413 \to 0.9532$ (Tier 1 → 2 → 3 → Fast-Track)
- Đang 0.90, sai 1 lần: **0.6025**

### 2.2. Luật chấm Feynman mới
- **Đạt** khi và chỉ khi `core_accuracy >= 70`. `core_accuracy` = hiểu đúng **vì sao code viết như vậy** + **bám đúng code thật** (nhắc đúng hàm/biến/luồng).
- `simplicity` (ẩn dụ đời thường) = **điểm cộng**, không ảnh hưởng Đạt/Trượt.
- Dùng thuật ngữ **không bị trừ điểm**; `detected_jargons` chỉ để gợi ý giải nghĩa.
- Chống học vẹt bằng tiêu chí **bám code** (đọc thuộc định nghĩa mà không chỉ ra trong code này → Trượt), KHÔNG bằng phạt thuật ngữ.
- Câu hỏi "Hãy dùng ẩn dụ đời thường giải thích…" → đổi thành "Hãy giải thích vì sao… (có thể dùng ví dụ đời thường)".

## 3. Các chỗ cần sửa
| File | Dòng (xấp xỉ) | Việc cần làm |
| :--- | :--- | :--- |
| `references/GIAO_TRINH_THUAT_TOAN_CHUAN.md` | 453–457 | Luật Obs: bỏ điều kiện `simplicity >= 70` |
| `references/GIAO_TRINH_THUAT_TOAN_CHUAN.md` | 465–492 | Thay tham số và toàn bộ phép tính chạy tay theo Mục 2.1 |
| `references/GIAO_TRINH_THUAT_TOAN_CHUAN.md` | 523–525 | Sau 1 lần đúng là 0.5767 (Tier 2); thêm 1 câu: cần 3 lần đúng mới Fast-Track |
| `00_CORE_SPEC/Kich_Ban_UseCase.md` | 225–229 | Luật Đạt mới; `simplicity` là điểm cộng |
| `00_CORE_SPEC/Kich_Ban_UseCase.md` | 253–256 | Tham số mới (sửa cả $P(L_0)=0.20$ thành 0.25) và kết quả 0.5767 |
| `00_CORE_SPEC/03_SYSTEM_EDGE_CASES_AUDIT.md` | 164 | Backend kiểm tra `core_accuracy >= 70` |
| `00_CORE_SPEC/03_SYSTEM_EDGE_CASES_AUDIT.md` | 198, 205–207 | Viết lại Case: chống học vẹt bằng "bám code", không phạt thuật ngữ |
| `00_CORE_SPEC/03_SYSTEM_EDGE_CASES_AUDIT.md` | 235 | Case 4.3: $P(S)=0.12$, đang 0.90 sai 1 lần còn **0.6025** |
| `00_CORE_SPEC/03_SYSTEM_EDGE_CASES_AUDIT.md` | 312, 364, 378 | Bỏ việc từ chối vì thiếu ẩn dụ / dùng thuật ngữ; thay bằng tiêu chí bám code |
| `03_UI_VA_KICH_BAN/01_UI_TRI_PANE_FSM.md` | 83 | "nhập lời giải thích bằng lời của mình (ẩn dụ đời thường là điểm cộng)" |
| `03_UI_VA_KICH_BAN/02_KICH_BAN_PITCH_DEMO.md` | 46 | Câu hỏi mẫu theo Mục 2.2 |
| `KyVong45.md` | 81–82 | Câu hỏi mẫu theo Mục 2.2; "2 tiêu chí" → `core_accuracy` quyết định, `simplicity` là điểm cộng |
| `04_ROADMAP_KY_THUAT/ROADMAP_KY_THUAT_CHI_TIET.md` | 35 | Ghi tham số hiện tại theo Mục 2.1 (vẫn giữ ý "tham số đặt tay, cần fit EM") |

Số dòng có thể lệch vài dòng; hãy tìm theo nội dung.

## 4. KHÔNG được đụng vào
- `archive/`, `.claude/`, `BAO_CAO_THAM_DINH_GIAM_KHAO.md` (biên bản thẩm định, giữ nguyên), `references/docchoi.md`, `cockpit_demo.html`, `index.html`.
- Các ngưỡng Tier (0.45 / 0.75 / 0.92), ngưỡng decay, số liệu độ trễ/chi phí: giữ nguyên.
- Văn phong: tiếng Việt, giữ Mermaid/LaTeX, chỉ sửa đúng các ý trên.

## 5. Tiêu chí hoàn thành (Claude sẽ kiểm tra bằng các lệnh này)
- Không còn kết quả (ngoài `archive/`, `BAO_CAO_*`, `docchoi.md`, `cockpit_demo.html`):
  `0.7429`, `0.9585`, `0.0388`, `simplicity >= 70`, `simplicity \ge 70`, `P(S) = 0.05`, `P(S)=0.05`, `P(L_0) = 0.20`
- Có xuất hiện `0.5767` trong `GIAO_TRINH_THUAT_TOAN_CHUAN.md` và `Kich_Ban_UseCase.md`.
- Có xuất hiện `0.6025` trong `03_SYSTEM_EDGE_CASES_AUDIT.md`.

Xong thì trả lời ngắn: danh sách file đã sửa + chỗ nào không chắc.
