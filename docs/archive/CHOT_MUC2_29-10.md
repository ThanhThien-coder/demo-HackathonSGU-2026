# Chốt Mục 2 `spec/00` — buổi 29/10/2026

> File nháp (chưa track). Ghi lại quyết định của nhóm về D-06…D-32 + giải thích cho người chưa theo kịp. Dùng làm đầu vào cho TASK_05 (sửa spec). Xong TASK_05 thì xóa file này.

## A. Đã chốt — đưa vào TASK_05

| Mã | Chốt | Hệ quả phải sửa |
| :-- | :-- | :-- |
| D-27 | **Host = Vercel** (miễn phí, region `sin1` gần Supabase). | `spec/03` API-08: cache RAM chỉ để nhanh hơn, **không được dựa vào**; mất cache ⇒ tải lại zip theo commit SHA + chạy lại engine. `spec/04`, `pitch/KIEN_TRUC_BGK.md` đổi Railway → Vercel. |
| D-28 | **Không dùng Pino.** Tự viết hàm `log()` ~15 dòng in JSON qua `console`; gọi 1 lần trong wrapper của route. Giữ danh sách cấm ghi. | `spec/04` Mục 9, D-28. |
| D-29 | Monitoring = log + Observability có sẵn của Vercel + dashboard Supabase. | `spec/04` Mục 10. |
| D-30 | Vercel tự deploy khi code vào `main` (+ link preview mỗi PR); GitHub Actions chạy typecheck + lint + vitest. | `spec/04` Mục 12. |
| D-31 | Không Redis / queue ngoài. | (xem B-1 về tải ngầm) |
| D-32 | Lệch ABI ⇒ đổi bản `web-tree-sitter`. | Đã sửa trong TASK_04. |
| D-06 | Giữ. | — |
| D-07 | Giữ cạnh = **dùng chung hàm**; "dễ hơn" = độ phức tạp do engine đếm (dùng lại số của D-12). Node không chung hàm với ai ⇒ đứng riêng, mở từ đầu. | — |
| D-10 | Giữ (giới hạn theo số file, không theo thời gian; có `engine_version`). | — |
| D-11 | **Bỏ đoán nhánh.** Chỉ nhận link gốc repo, dùng nhánh mặc định (định nghĩa ở Mục D). | `spec/10` (bỏ luật thử ref, `MAX_REF_CANDIDATES`), `02`, `30` (thông báo lỗi link). |
| D-12, D-19, D-23 | Giữ. | — |
| D-13 | Giữ, **so khớp lỏng**: đoạn AI trích chỉ cần là một đoạn con có trong câu trả lời sau chuẩn hóa, không đòi nguyên câu. | `spec/21`, `20`. |
| D-20 | Giữ `overall_tier` để hiển thị. | — |
| **Fast-Track** | **Bỏ hẳn.** Người giỏi muốn luyện thì vẫn luyện; tự động cho qua là không có ích. | `02` (`FAST_TRACK_MIN`…), `03` §5, `22`, `30`, `40` §6 ("không bao giờ cắt" bỏ Fast-Track), **`pitch/KICH_BAN_DEMO.md` phút 3:20–3:50 phải thay đoạn khác**. |
| D-21 | **Bỏ** persona `SENIOR_ACTIVE` (chỉ để demo Fast-Track). | `02`, `03`, kịch bản demo. |
| D-25 + ôn tập | **Bỏ** run `REMEDIATION` và `DECAY_REVIEW` (node đỏ thì để đỏ; viền cam vẫn hiện). Muốn học lại ⇒ nút **"Học lại từ đầu"** tạo phiên mới (xem B-3). | `20`, `22`, `03`, `30`, `40` §6. |
| D-22 | Giữ "Báo sai". Câu trả lời **đã được lưu trong DB** (`question_attempts.student_answer`, `spec/03`) ⇒ dò lại bằng DB, **không** ghi câu trả lời vào log. | — |
| D-26 | **Đơn giản hóa:** repo có commit mới ⇒ tạo bản đồ / phiên mới. Phiên đang học luôn tải lại zip **theo đúng commit SHA** của phiên ⇒ không bao giờ lệch. Bỏ nhánh `ARCHIVE_HASH` + thông báo "repo đã thay đổi". | `03` §4, `10`. Cần kiểm H+1: tải zip theo SHA được. |

## B. Claude đề xuất khác ý ban đầu — cần nhóm xác nhận

1. **D-31 tải ngầm các node:** không tải ngầm *tất cả* (6–8 lời gọi Gemini cùng lúc dễ dính 429 gói free, tốn token cho node không ai mở). Đề xuất: **client tự tải trước 1–2 node kế tiếp** theo thứ tự mở khóa, lần lượt từng cái. Không cần queue.
2. **D-08 giữ lại.** D-08 không thêm truy vấn DB nào — chỉ là cách *đặt tên* node (băm tên hàm entry, ~5 dòng code). Không có nó thì mở lại phiên, mã node đổi ⇒ tiến độ đã lưu không khớp node nào — đúng cái "sai 1 cái sai cả dàn" mà nhóm lo.
3. **"Học lại từ đầu"** = tạo `learning_session` mới cho cùng repo; tiến độ node làm lại từ đầu; **điểm kỹ năng BKT giữ nguyên** (đó là hồ sơ người học). Câu hỏi mới vì không cache câu hỏi (B-4).
4. **D-15 giữ một nửa.** Cache **bản phân tích node + tổng quan** (giống nhau với mọi người, chỉ phụ thuộc code; giảm token; là thứ nhóm duyệt tay cho repo demo theo `spec/21` §10 và dùng cho offline). **Bỏ cache câu hỏi** (câu hỏi lập theo kỹ năng yếu của từng người ⇒ mỗi người một bộ; học lại ra câu mới). **Chấm bài không bao giờ cache.**

## C. Giải thích cho đồng đội

- **Chống gọi AI trùng (in-flight map):** 2 request cùng xin phân tích 1 node cùng lúc (bấm 2 lần, 2 người) ⇒ request sau **chờ kết quả của request trước** thay vì gọi Gemini lần nữa.
- **Giới hạn repo xử lý cùng lúc (semaphore):** tối đa `CONFIG.MAX_CONCURRENT_INGESTIONS` repo được tải + phân tích đồng thời; ai tới sau xếp hàng chờ ⇒ máy chủ không hết RAM khi nhiều người dán link cùng lúc. Trên Vercel chỉ có tác dụng trong từng instance.
- **D-09 Hub:** PageRank đo "file bị gọi nhiều nhất" — trong web thường là file database (ai cũng gọi). Người mới nên bắt đầu từ **cửa vào** (route / controller) ⇒ Hub chỉ được chọn trong các file cửa vào; PageRank chỉ dùng để xếp thứ tự node.
- **D-14 challenge token:** khi phát câu hỏi, server đưa cho trình duyệt một **"vé" có chữ ký** chứa: id câu hỏi, đoạn code liên quan (đã che secret), user / session / run, hạn dùng. Nộp bài thì gửi kèm vé; server kiểm chữ ký (trình duyệt không sửa được) rồi lấy code trong vé ra chấm. Nhờ vậy server **không cần giữ code trong RAM hay ghi xuống đĩa**. Trên Vercel (RAM không chắc còn) cái này càng cần.
- **D-16 lượt học (`node_runs`):** mỗi lần học 1 node là 1 "lượt" có bộ câu hỏi cố định; mỗi lần nộp ghi 1 dòng `question_attempts`. Màu node tính từ lượt gần nhất. (Bỏ REMEDIATION / DECAY_REVIEW ⇒ mỗi node trong 1 phiên chỉ còn 1 lượt.)
- **D-17 / D-18 "kiểm trước" khi nộp bài:** trước khi gọi AI chấm, server kiểm (không khóa): phiên đúng của người này; câu hỏi tồn tại, chưa xong; còn lượt nộp (< `CONFIG.MAX_ATTEMPTS_PER_QUESTION`); vé hợp lệ; chưa hết quota token; DB đọc được. Sai 1 cái ⇒ trả lỗi, **không tốn token**. Chấm xong ⇒ khóa dòng, kiểm lại số lượt (chống nộp 2 lần cùng lúc) rồi mới ghi.
- **D-24 node nhóm:** hàm phức tạp không thuộc chức năng nào (thường là thuật toán) được gom vào **khung "Thuật toán"** trên bản đồ cho gọn. Khung không có code ⇒ không học; các node bên trong học bình thường. Repo dạng script (Python chạy từ trên xuống, không có route) ⇒ engine chia file thành các "chặng" `vnode-*` — có code thật nên học được.

## D. Link gốc repo (D-11)

Chấp nhận: `https://github.com/<chủ>/<repo>` — có thể kèm `/` cuối hoặc `.git`, có hoặc không `www.`.

| Nhập | Kết quả |
| :-- | :-- |
| `https://github.com/expressjs/express` | ✅ |
| `https://github.com/expressjs/express/` | ✅ |
| `https://github.com/expressjs/express.git` | ✅ |
| `github.com/expressjs/express` | ✅ (tự thêm `https://`) |
| `https://github.com/expressjs/express/tree/5.x` | Đề xuất: **cắt phần sau tên repo**, dùng nhánh mặc định, hiện ghi chú "Chỉ hỗ trợ nhánh mặc định" |
| `https://github.com/expressjs/express/blob/master/index.js` | Như trên |
| `https://gitlab.com/...`, link không phải repo | ❌ lỗi link không hợp lệ |

Tải: zip nhánh mặc định của repo; ghi lại commit SHA; các lần tải sau trong phiên dùng đúng SHA đó (D-26).
