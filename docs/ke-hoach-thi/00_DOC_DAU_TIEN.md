# 00 — Đọc đầu tiên: kế hoạch thi Hackathon SGU (07–08/11/2026)

> Bộ kế hoạch cho đội SimpliFey 5 người: Thiện, Minh, Nhân, Phát, Quý. H+0 = **12:00 thứ Bảy 07/11/2026**.
> Bộ này do trợ lý AI lập một mình qua đêm, không có ai trả lời câu hỏi. Chỗ nào phải tự quyết đều ghi ở [`08_CAU_HOI_CHO_CHOT.md`](08_CAU_HOI_CHO_CHOT.md), kèm mặc định.

## 1. Cảnh báo đầu tiên

1. **Repo tập dượt `demo-HackathonSGU-2026` đang PUBLIC** (theo đề bài giao việc). Kế hoạch cũ ghi repo tập phải private. Repo public chứa code gần giống sản phẩm thi, BTC có thể coi là "code chuẩn bị trước". **Trưởng nhóm tự quyết** (Q-18). Trợ lý không đổi visibility và không tự kiểm lại.
2. **Không chép code của repo tập sang repo thi**, dù chép nguyên file hay chia nhỏ ra nhiều commit. Phiếu việc chỉ mô tả bằng lời. Repo tập không được nằm trong thư mục làm việc của agent trong giờ thi.
3. **Mốc chặt:** ngừng code **09:00**, nộp file thuyết trình **trước 09:30**, thuyết trình **10:00–11:30** ngày 08/11. Đóng băng tính năng **04:00 (H+16)**.

## 1A. Bối cảnh ngày thi: repo trống, AI viết code từ `docs/`

- Lúc 12:00 repo thi **trống**, chưa có `src/`, không có file code nào từ trước.
- Mỗi người đặt thư mục `docs/` (gồm `docs/spec/`, `docs/ke-hoach-thi/`, `docs/prototype.html`) ngay trong repo thi để AI đọc. **`docs/` nằm trong `.gitignore` từ commit đầu (TH-01)**, nên vừa có sẵn cho AI vừa không bị commit lên GitHub. Thứ tự chép và cách kiểm ở [`03_GIT_PUSH_PULL.md`](03_GIT_PUSH_PULL.md) Mục 2.
- **Mỗi mã phiếu là 1 file** trong thư mục của từng người: `docs/ke-hoach-thi/phieu/thien/`, `phieu/minh/`, `phieu/nhan/`, `phieu/phat/`, `phieu/quy/` (ví dụ `phieu/minh/MI-06.md`). File `02_PHIEU_<TEN>.md` là mục lục, có bảng giờ và cột "Cách làm".
- **Đầu mỗi file phiếu (Mục 1)** là khối prompt dán nguyên cho Claude. Claude tự tạo nhánh, đọc phiếu và `docs/spec/`, code, chạy `typecheck`, `lint`, `test`, commit nhỏ, push và mở PR bằng `gh`. **Việc của mỗi người:** dán prompt, trả lời khi Claude hỏi, thử tay theo "Tiêu chí đạt", rồi tự bấm merge PR vào `main` trên GitHub (Mục 2 của file phiếu). Phiếu không dùng Claude (deploy, duyệt tay, slide, áp phích) ghi rõ "KHÔNG dùng Claude" ở Mục 1. Phiếu sửa lỗi sau đóng băng có prompt mẫu, điền lỗi rồi mới dán.
- Phần lõi của prompt (bước Code) luôn có 4 câu: đọc spec nào ⇒ tạo file nào, export hàm gì với chữ ký gì ⇒ luồng xử lý, phần bỏ qua, chỗ không được khóa người dùng ⇒ bẫy cần tránh và lệnh tự kiểm.
- Tên file, tên hàm và chữ ký trong phiếu là **hợp đồng giữa 5 người**: code của Thiện, Minh, Nhân, Phát ghép vào nhau được là nhờ đúng các tên này. Không tự đổi.

## 2. Có kịp không — nói thẳng

- **Giữ nguyên phạm vi của repo tập thì không kịp.** Repo tập có khoảng 35 nghìn dòng trong `src/`, riêng engine hơn 15 nghìn dòng (đếm bằng `wc -l` trên máy, gồm cả test). Viết lại toàn bộ trong 16 giờ với 5 người là không thực tế.
- **Kịp có điều kiện** nếu làm đủ 4 việc:
  1. Cắt toàn bộ nhóm B trong [`01_KIEM_KE_VA_CAT_GIAM.md`](01_KIEM_KE_VA_CAT_GIAM.md) Mục 3 ngay từ đầu.
  2. Engine làm TS/JS trước. Java/Spring cho repo demo Q-03 chạy song song, chốt ở cổng G5 lúc 23:00.
  3. Deploy tay `gcloud run deploy --source`, không gỡ lỗi pipeline trong giờ thi.
  4. Giữ kỷ luật agent: quá 30 phút thì chia nhỏ, làm lại tối đa 1 lần.
- **Độ dư:** từ lát dọc 2 (23:00) tới đóng băng (04:00) có 5 giờ, nhưng gần hết đã có việc ngoài đường găng. Vì vậy trễ trên đường găng phải trả bằng **cắt tính năng**, không lấn giờ ngủ.
- Cổng G4 (lát dọc 1, 20:00) trễ quá 1 giờ thì **không còn giữ được cả Java lẫn giải thích đoạn chọn đầy đủ**. Cắt theo `01` Mục 4.
- Mọi thời lượng trong bộ này là **ước tính**. Không có số đo nào được bịa ra.

## 3. Ai đọc gì (theo thứ tự)

**Trưởng nhóm** là người đội đã chọn làm trưởng nhóm (đề bài không ghi tên). Nếu lúc 11:00 chưa rõ ai thì Thiện quyết thay.

| Người | Đọc |
| :-- | :-- |
| **Trưởng nhóm** | File này ⇒ [`BAO_CAO_CHAY_DEM.md`](BAO_CAO_CHAY_DEM.md) ⇒ [`08_CAU_HOI_CHO_CHOT.md`](08_CAU_HOI_CHO_CHOT.md) Mục 1 (trả lời trước 11:30) |
| **Cả đội** | File này ⇒ [`04_TIMELINE_VA_PHU_THUOC.md`](04_TIMELINE_VA_PHU_THUOC.md) Mục 4–6 ⇒ [`03_GIT_PUSH_PULL.md`](03_GIT_PUSH_PULL.md) ⇒ phiếu của mình ⇒ [`06_THUYET_TRINH_VA_TRUOC_GIO_THI.md`](06_THUYET_TRINH_VA_TRUOC_GIO_THI.md) Mục 4 |
| Thiện | + [`02_PHIEU_THIEN.md`](02_PHIEU_THIEN.md), [`05_DEPLOY_CLOUD_RUN.md`](05_DEPLOY_CLOUD_RUN.md) |
| Minh | + [`02_PHIEU_MINH.md`](02_PHIEU_MINH.md), [`07_KHAO_SAT_6_GHI_CHU.md`](07_KHAO_SAT_6_GHI_CHU.md) ghi chú 2 |
| Nhân | + [`02_PHIEU_NHAN.md`](02_PHIEU_NHAN.md), [`07_KHAO_SAT_6_GHI_CHU.md`](07_KHAO_SAT_6_GHI_CHU.md) ghi chú 1, 6 |
| Phát | + [`02_PHIEU_PHAT.md`](02_PHIEU_PHAT.md), [`07_KHAO_SAT_6_GHI_CHU.md`](07_KHAO_SAT_6_GHI_CHU.md) ghi chú 3, 4, 5 |
| Quý | + [`02_PHIEU_QUY.md`](02_PHIEU_QUY.md) |

Danh sách file trong thư mục này: `00_DOC_DAU_TIEN` đọc đầu tiên · `01` kiểm kê và cắt · `02_PHIEU_THIEN`, `02_PHIEU_MINH`, `02_PHIEU_NHAN`, `02_PHIEU_PHAT`, `02_PHIEU_QUY` phiếu việc 5 người · `03_GIT_PUSH_PULL` git và thư mục `docs/` · `04` đồ thị phụ thuộc và timeline · `05` deploy · `06` thuyết trình, DoD, việc trước giờ thi · `07` khảo sát 6 ghi chú test · `08` câu hỏi chờ chốt · `BAO_CAO_CHAY_DEM` báo cáo lượt lập kế hoạch · `tu-kiem/kiem-ke-hoach.mjs` script tự kiểm.

## 4. Mốc chính

| Giờ | H+n | Mốc |
| :-- | :-- | :-- |
| 12:00 | H+0 | Thiện push commit đầu, cả đội pull lúc 12:20 |
| 13:00 | H+1 | Contracts chốt; cả 5 người có commit trên `main` |
| 14:00 | H+2 | Bản khung sống trên Cloud Run |
| 19:30–20:00 | H+7,5–8 | **Lát dọc 1:** dán link ⇒ bản đồ thật ⇒ bấm bài ⇒ X-Ray thật |
| 23:00 | H+11 | **Lát dọc 2:** câu hỏi ⇒ chấm (không khóa gắt) ⇒ gợi ý ⇒ BKT ⇒ đổi màu, lưu Postgres. Chốt Java |
| 02:00 | H+14 | Đủ endpoint giữ lại; dừng mọi việc Docker |
| **04:00** | **H+16** | **Đóng băng**, chạy DoD, deploy production |
| 07:30 | H+19,5 | Slide bản 1 |
| 09:00 | H+21 | Ngừng code, commit cuối của cả 5 người |
| 09:15 | — | Nộp file thuyết trình (hạn 09:30) |
| 10:00–11:30 | — | Thuyết trình, chạy thử, phản biện |

So với kế hoạch cũ (`doc-de-hieu/07_ke_hoach_21h.md`: lát dọc 1 H+8, lát dọc 2 H+12, đóng băng H+17), lịch mới **sớm hơn**: lát dọc 1 H+7,5–8, lát dọc 2 H+11, đóng băng H+16. So với khung của đề (lát dọc 1 khoảng H+7), lát dọc 1 **trễ khoảng 30 phút**, vì Tầng 0 và engine cùng xong lúc 19:15–19:30. **Giờ cắt Dockerfile dời lên H+2**: quyết dùng Docker hay không ngay ở lần deploy đầu; Docker không được làm sau 00:00, và mọi nhánh Docker đóng ở H+14 (02:00).

## 5. Bảng rủi ro

| # | Rủi ro | Dấu hiệu sớm | Ứng phó | Người theo dõi |
| :-- | :-- | :-- | :-- | :-- |
| R1 | Repo tập public bị coi là code chuẩn bị trước | — | Trưởng nhóm quyết **trước 11:00** (Q-18); đề xuất chuyển private, vì repo thi có cùng cây thư mục và tên file với repo tập. Repo thi viết mới hoàn toàn, commit nhỏ đều đặn | Trưởng nhóm |
| R2 | Cloud Run chưa từng chạy được | 14:00 `/api/health` chưa trả 200 | Cổng G2: Dockerfile ngay; 15:30 vẫn lỗi ⇒ Vercel làm bản chính tạm | Thiện |
| R3 | Biến `NEXT_PUBLIC_*` không vào bản build `--source` | Nút đăng nhập gọi sai URL | `--set-build-env-vars`, không được thì Dockerfile có `ARG` (`05` Mục 3) | Thiện |
| R4 | Vertex AI lỗi quyền hoặc model chưa mở | 20:15 `analyze-node` trên Cloud Run lỗi 403/404 | Q-04: chuyển `studio` | Thiện + Nhân |
| R5 | Engine trễ, lát dọc 1 trễ | 18:30 MI-05 chưa merge | Cổng G4: cắt Java, `/history`; UI tiếp tục trên fixture | Minh |
| R6 | Java/Spring không ra bài đọc được | 23:00 repo Q-03 dưới `CONFIG.DISPLAY_MIN_NODES` bài | Cổng G5: demo bằng repo TS/JS dự phòng | Minh |
| R7 | Model AI hết hạn mức hoặc trả 404/429 | 13:00 gọi thử thất bại | Demo Offline; đổi sang Groq (D-50) cần viết lớp gọi mới, không đổi kịp trong giờ thi | Nhân |
| R8 | Lệch ABI Tree-sitter | 13:30 parser lỗi khi nạp grammar | Đổi phiên bản `web-tree-sitter` cho khớp grammar, không tự build (D-32) | Minh |
| R9 | Supabase bị tạm dừng | Lỗi kết nối DB | Đánh thức trước giờ thi; Dashboard khôi phục | Thiện |
| R10 | Câu chấm trên sân khấu khác lần tập | Lệch trong 3 lần chạy thử | Chỉ dùng câu ổn định 3/3 (NH-11); còn lại dùng Offline | Nhân |
| R11 | Mạng hội trường chập chờn | Lỗi khi tập | Mạng di động (Quý cầm điện thoại); Offline | Quý |
| R12 | Một người chưa có commit | 13:00 `git shortlog -sn` thiếu tên | Cổng G1: commit ngay phần đang làm (code thật) | Thiện |
| R13 | Squash merge làm lịch sử trông như bulk commit | — | Chỉ dùng "Create a merge commit" (`03` Mục 3) | Thiện |
| R14 | Phát quá tải 19:45–23:45 | PH-08 trễ quá 30 phút | Thiện nhận trang chủ (TH-13); cắt lịch sử lượt, chip "Còn dùng ở" | Phát |
| R15 | Người nói chính thiếu ngủ | — | Nhân ngủ 05:00–08:30; Minh đọc thay ở tổng duyệt 1 | Thiện |
| R16 | Agent đọc nhầm repo tập rồi chép code | Code giống hệt repo tập | Repo tập không nằm trong thư mục agent; câu "Không mở hoặc chép code từ repo tập dượt" có trong mọi prompt | Cả 5 |
| R17 | Lộ khóa bí mật khi chụp ảnh, quay video, chia sẻ màn hình | — | Dùng tài khoản demo; không mở `.env.local` khi đang chia sẻ màn hình | Phát |
