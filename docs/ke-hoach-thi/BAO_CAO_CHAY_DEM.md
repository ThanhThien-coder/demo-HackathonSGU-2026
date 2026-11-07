# Báo cáo chạy đêm — lập kế hoạch thi

> File tiến độ của lượt lập kế hoạch tự động. Ghi lại sau mỗi giai đoạn, để nếu bị ngắt giữa chừng thì người sau biết đã làm tới đâu.
> Người chạy: trợ lý AI (Claude), chạy một mình, không có ai trả lời câu hỏi. Ngày chạy: 07/11/2026, trước giờ có mặt 10:00.

## 1. Ba điều trưởng nhóm phải đọc trước

1. **Repo tập dượt `demo-HackathonSGU-2026` đang PUBLIC (theo đề bài giao việc).** Kế hoạch cũ (`docs/doc-de-hieu/07_ke_hoach_21h.md` Mục 4, "Buổi tập 21 giờ") ghi repo tập phải **private**. Repo public chứa sẵn code gần giống sản phẩm thi, nên BTC hoặc đội khác có thể coi đó là "code chuẩn bị trước". Trưởng nhóm tự quyết có đổi sang private hay không. Trợ lý **không đổi visibility** và cũng **không tự kiểm tra lại** trạng thái này (phiên này chỉ đọc file trên máy, không chạy `git` hay `gh`).
2. **Đóng băng lúc 04:00 (H+16) chỉ khả thi khi cắt đúng danh sách ở [`01_KIEM_KE_VA_CAT_GIAM.md`](01_KIEM_KE_VA_CAT_GIAM.md).** Nếu giữ nguyên phạm vi của repo tập (khoảng 35 nghìn dòng trong `src/`, engine riêng đã hơn 15 nghìn dòng) thì **không kịp**. Rủi ro lớn nhất là engine Java/Spring cho repo demo Q-03. Kế hoạch làm TS/JS trước, rồi chốt Java ở cổng H+11. Chi tiết ở [`00_DOC_DAU_TIEN.md`](00_DOC_DAU_TIEN.md) Mục 2.
3. **Chưa có gì từng chạy được trên Google Cloud Run** (theo đề bài: 3 lần chạy `deploy.yml` gần nhất ngày 06/11 đều thất bại, bản đang sống là Vercel). Kế hoạch đổi sang deploy tay bằng `gcloud run deploy --source` ngay từ H+1, và chưa dùng pipeline tự động. Chi tiết ở [`05_DEPLOY_CLOUD_RUN.md`](05_DEPLOY_CLOUD_RUN.md).

## 2. Việc đã làm và chưa làm

| Giai đoạn (Mục 8 của đề) | Trạng thái | Ghi chú |
| :-- | :-- | :-- |
| 1. Đọc tài liệu | Xong | Đã đọc `CLAUDE.md`, `AGENTS.md`, `thele.md`, `07_ke_hoach_21h.md`, `01_deploy.md`, `spec/05`, phần cần dùng của `spec/00`, `spec/30`, `spec/50` (DoD), `spec/04` Mục 16, `pitch/KICH_BAN_DEMO.md`, `review/loi_da_gap.md` |
| 1b. Kiểm kê và cắt râu ria | Xong | [`01_KIEM_KE_VA_CAT_GIAM.md`](01_KIEM_KE_VA_CAT_GIAM.md) |
| 2. Xác minh deploy | **Làm một phần** | Không chạy `gh run list` và `gh run view --log-failed`, vì người dùng đã dặn trong phiên này: chỉ đọc file trên máy, không đụng repo, không chạy lệnh git. Đã đọc `deploy.yml`, `Dockerfile`, `next.config.ts`, `.env.example`, `src/instrumentation.ts`, `src/server/ai/gemini.ts` để tìm nguyên nhân **nghi ngờ**. Kết luận ở [`05_DEPLOY_CLOUD_RUN.md`](05_DEPLOY_CLOUD_RUN.md) Mục 1 |
| 3. Khảo sát 6 ghi chú test | Xong (đọc code, chưa chạy app) | [`07_KHAO_SAT_6_GHI_CHU.md`](07_KHAO_SAT_6_GHI_CHU.md). Không chạy app nên không có ảnh chụp và không có số đo mới |
| 4. Đồ thị phụ thuộc và đường găng | Xong | [`04_TIMELINE_VA_PHU_THUOC.md`](04_TIMELINE_VA_PHU_THUOC.md) Mục 1–3 |
| 5. Timeline | Xong | [`04_TIMELINE_VA_PHU_THUOC.md`](04_TIMELINE_VA_PHU_THUOC.md) Mục 4–7 |
| 6. Năm file phiếu việc | Xong | `02_PHIEU_THIEN.md`, `02_PHIEU_MINH.md`, `02_PHIEU_NHAN.md`, `02_PHIEU_PHAT.md`, `02_PHIEU_QUY.md` |
| 7. Git, deploy, thuyết trình, trước giờ thi, rủi ro, câu hỏi | Xong | `04`, `05`, `06`, `00` (rủi ro), `08` |
| 8. Tự kiểm bằng script | Xem Mục 4 bên dưới | `tu-kiem/kiem-ke-hoach.mjs` |
| 9. Soát lại như người lạ | Xem Mục 4 bên dưới | Nhờ 1 subagent chỉ đọc |

**Không làm (đúng giới hạn của đề):** không sửa `src/`, `docs/spec/` hay file nào ngoài `docs/ke-hoach-thi/`; không commit, push, tạo PR hay Issue; không chạy lệnh thay đổi GCP, Supabase, GitHub Secrets, Vercel; không đọc `.env*` (chỉ đọc `.env.example`); không tạo repo thi; không viết code cho repo thi.

**Không chạy:** `npm test`, `typecheck`, `lint`, `build` của repo tập. Lý do: kế hoạch không cần các kết quả này, và chạy build có thể tạo hoặc ghi đè thư mục `.next` trong repo.

## 3. Giả định đã tự chọn (đã chép vào file câu hỏi)

| Mã | Giả định | Vì sao chọn | Câu hỏi |
| :-- | :-- | :-- | :-- |
| GD-01 | Lập lịch theo mốc chặt: ngừng code 09:00, nộp file trước 09:30 | Đề bài yêu cầu | Q-01 |
| GD-02 | Repo demo giữ Q-03 (Java Spring). Có sẵn 1 repo TS/JS dự phòng, chốt ở cổng H+11 | Không tự đổi quyết định đã chốt, nhưng phải có đường lùi | Q-02 |
| GD-03 | Deploy tay `gcloud run deploy --source` là đường chính. Bỏ staging, smoke bot và `deploy.yml` khỏi đường găng | `deploy.yml` chưa từng chạy được, mà giờ thi không đủ để gỡ lỗi pipeline | Q-03 |
| GD-04 | Nới các khóa người dùng theo ghi chú 6, mặc định **áp dụng** nếu đội không phản đối trước 11:30 | Chính đội đã yêu cầu ở ghi chú 6 | Q-05 … Q-09 |
| GD-05 | Người nói chính: Nhân. Người bấm máy: Phát. Slide: Minh chính, Thiện dự phòng | Cần người nói chính được ngủ sát giờ lên sân khấu | Q-10 |
| GD-06 | Màu và font lấy theo `spec/30` Mục 11. Bố cục và nhãn lấy theo `prototype.html` | D-89 ghi "giữ màu, font của `30` Mục 11" | Q-11 |
| GD-07 | Vertex AI trên Cloud Run lỗi thì chuyển `GEMINI_BACKEND="studio"`, key nằm trong Secret Manager | Trái D-66 nhưng giữ được buổi demo | Q-04 |

## 4. Nhật ký các giai đoạn

- **Giai đoạn 1–5 (đọc, kiểm kê, khảo sát, phụ thuộc, timeline):** xong. Không gặp lỗi quyền.
- **Giai đoạn 6–7 (viết file):** xong. 14 file `.md` + `tu-kiem/kiem-ke-hoach.mjs`. Có 67 phiếu: Thiện 18, Minh 13, Nhân 13, Phát 15, Quý 8.
- **Giai đoạn 8 (tự kiểm):** script kiểm 20 tiêu chí: đủ file; đủ 16 trường của mẫu phiếu; mã liên tục; mã được nhắc đều có thật; phiếu không có khối code; không file nào bị 2 người sửa trừ chỗ có ghi bàn giao; mảng độc lập không bị ai phụ thuộc; prompt cấm chép repo tập; thời lượng ghi "ước tính"; 5 người có commit trước 13:00; không hướng dẫn sửa giờ commit; Mermaid parse được; link không hỏng; không có khóa; timeline đủ mốc; đủ 6 ghi chú; lời lẽ trung tính; số mục tiêu ghi "chưa đo"; tham chiếu ghi rõ UI/Backend; phiếu UI có nhắc spec/30 hoặc prototype.
  - Lần chạy 1: **17/20**. Lỗi: (a) tool `mmcheck` của ai-kit thiếu gói `jsdom` nên không kiểm được Mermaid; (b) ghi chú 5 chưa ghi mức chắc chắn; (c) PH-14, PH-15 chưa nhắc spec/30.
  - Đã sửa (b), (c). Với (a): không cài gói vào thư mục ai-kit (ngoài thư mục được phép sửa). Thay vào đó chép tool sang thư mục tạm của phiên, chạy `npm ci` ở đó, rồi trỏ script tới bản chép qua biến `MMCHECK`.
  - Lần chạy 2: **20/20 đạt**. Lệnh chạy lại: `node docs/ke-hoach-thi/tu-kiem/kiem-ke-hoach.mjs` (máy chưa cài gói cho `mmcheck` thì C12 báo lỗi; cài bằng `npm ci` trong thư mục tool hoặc đặt biến `MMCHECK` trỏ tới bản đã cài).
- **Giai đoạn 9 (soát như người lạ):** đã nhờ 1 subagent chỉ đọc. Kết quả và các sửa đổi ghi ở Mục 5 bên dưới.

## 5. Kết quả soát của subagent và việc đã sửa

Subagent chỉ đọc, đọc hết 14 file và báo 25 vấn đề. Đã sửa:

| Vấn đề | Đã sửa thế nào |
| :-- | :-- |
| Từ 23:45 tới 04:00 không có bản Cloud Run mới, trong khi nhiều phiếu đòi kiểm "trên Cloud Run" | Thêm lần deploy 00:15 (TH-16) và 04:05 (TH-17). Kiểm ban đêm làm trên máy, kiểm lại trên production lúc 04:05 |
| Lệnh deploy dài chạy lại sẽ xóa thay đổi `studio` của cổng G3 | `05` Mục 3 thêm lệnh ngắn cho các lần deploy sau, cấm chạy lại lệnh dài |
| Luật sau đóng băng mâu thuẫn với bundle Offline và commit cuối | Thêm nhãn `sau-dong-bang` (luật chung 10). Deploy lại lúc 05:00 sau bundle. PR cuối phải mở trước 03:45 |
| Phiếu bảo đọc `review/loi_da_gap.md` ở repo tập | Chép lỗi E06-10/11/12 vào MI-07. Luật chung 1 ghi rõ không ai cần mở repo tập |
| TH-10 không vừa 45 phút; G4 và tiêu chí TH-10 lệch nhau | Lát dọc 1 chạy trên máy lúc 20:00; deploy + G3 lúc 20:00–20:15; PR đường găng merge ngay khi CI xanh |
| NH-05/NH-06 đòi chạy repo demo khi engine thật chưa có | Lúc làm phiếu kiểm bằng fixture. Chạy 5 bài thật ở NH-08 (repo TS dự phòng) và NH-11 (repo đã chốt) |
| PH-10 làm trước khi có API; PH-04 làm trước đăng nhập và ingest | Dùng chế độ `?fixture=1`, kiểm với API thật ở giờ ghi rõ |
| NH-07 không nói dùng gì trước khi có `progress.ts` | Tạm viết thẳng bằng `db.tx` tới 22:00 |
| Bundle Offline không ghi được persona trên production (`DEMO_MODE=false`) | Ghi trên máy Nhân, bản build từ commit đóng băng, `DEMO_MODE=true` |
| Q-06 có tác dụng phụ lên Offline và test | Ghi vào Q-05, Q-06 và NH-10 |
| Hạn Q-13, Q-11 muộn hơn lúc làm | Q-13 hạn 13:30, Q-11 hạn 12:45 |
| TH-03 và PH-01 phụ thuộc Quý | TH-03 tự mở PR thử; PH-01 do Thiện kiểm |
| Thiện vừa phải trả lời 10 câu vừa làm TH-13/TH-14; Nhân không được sửa `PROMPT_VERSION` ban đêm | Thiện trả lời lúc 03:30–03:50 trong TH-17; thêm ngoại lệ `PROMPT_VERSION` ở `04` Mục 5 |
| Lịch tổng duyệt lệch giữa `03` và `06` | `06` Mục 3 là lịch tập duy nhất; `03` và các phiếu trỏ về đó |
| Bảng ngủ ghi sai Minh thức lúc 03:30 | Tách dòng 03:30–04:00 |
| "Trưởng nhóm" chưa rõ là ai; hạn Q-05…Q-09 lệch | Ghi định nghĩa trưởng nhóm, Thiện quyết thay nếu chưa rõ; hạn chung 11:30 |
| "Commit cuối" và lệnh kiểm mâu thuẫn | 1 luật, 1 lệnh kiểm ở `04` Mục 6 |
| Test DB không chạy được trong CI | Luật chung 9: mock `db`/`tx`, kiểm DB thật làm tay |
| `create-next-app` cần thư mục trống | TH-01, `04` Mục 2, `06` Mục 4.2: chép tài liệu sau khi tạo khung |
| Chỗ trỏ "`07` Mục" bị nhầm với file phiếu; chưa nói `spec/xx` nằm đâu | Đổi thành `doc-de-hieu/07_ke_hoach_21h.md`; luật chung 8 |
| MI-09 trỏ sai dòng DoD; PH-13 file và prompt lệch | Sửa theo bảng DoD đã lọc; prompt PH-13 khớp danh sách file |
| `00` Mục 4 nói sai so với lịch cũ | Viết lại: sớm hơn lịch cũ, trễ khoảng 30 phút so với khung của đề |
| "dưới 5 giây" của Vercel chưa đo; cách gọi Thiện "không biết code" | Ghi "mục tiêu, chưa đo"; đổi thành "người chưa đọc code repo demo" |

**Chưa làm được (ghi nhận):** không chạy `gh` để xem lỗi `deploy.yml` thật (Q-16); không chạy app nên chưa có ảnh so với prototype và chưa có số đo mới; cờ `--set-build-env-vars` và cách Buildpacks chạy `build` vẫn **CHƯA KIỂM CHỨNG**, phải thử ngay ở TH-04.

## 6. Cập nhật theo luồng tác chiến trên repo trống (07/11, lượt 2)

**Bối cảnh mới:** lúc thi repo trống, chưa có `src/`. Mỗi người đặt thư mục `docs/` (gồm `docs/spec/`, `docs/ke-hoach-thi/`, `docs/prototype.html`) ngay trong repo thi. `docs/` nằm trong `.gitignore` từ commit đầu. AI đọc phiếu và spec rồi viết toàn bộ code từ đầu.

**Đổi tên file** (cập nhật mọi liên kết):

| Tên cũ | Tên mới |
| :-- | :-- |
| `00_DOC_TRUOC.md` | `00_DOC_DAU_TIEN.md` |
| `07_PHIEU_<TEN>.md` | `02_PHIEU_<TEN>.md` |
| `04_GIT_VA_PUSH_PULL.md` | `03_GIT_PUSH_PULL.md` |
| `03_TIMELINE_VA_PHU_THUOC.md` | `04_TIMELINE_VA_PHU_THUOC.md` |
| `02_KHAO_SAT_6_GHI_CHU.md` | `07_KHAO_SAT_6_GHI_CHU.md` |

Các mục 1–5 ở trên ghi theo tên cũ, vì đó là nhật ký lượt 1.

**Đã làm:**

- **Viết lại cả 5 phiếu** (67 phiếu, giữ nguyên mã, giờ, phụ thuộc):
  - Mục "Tham chiếu bắt buộc" đổi thành **"Spec phải đọc"**. Mục này ghi đường dẫn `docs/spec/<file>.md` kèm số mục và mã D-xx. Phiếu UI ghi thêm vùng cụ thể trong `docs/prototype.html`.
  - Mục "Yêu cầu" ghi đường dẫn file cần tạo, tên hàm, kiểu, component cần export kèm chữ ký, và luồng Step 1, 2, 3…. Tên và chữ ký lấy từ code đã khảo sát, đối chiếu với `docs/spec/02_CONTRACTS.md`, viết bằng lời, không dán code.
  - Đã sửa 1 tên sai ở lượt 1: kiểu nối Tầng 0 với Tầng 1–2 là `IngestSource` / `IngestOutput` (đúng spec), không phải `IngestResult`. Đã chốt thêm 2 hàm nối: `runIngest` (Thiện) và `buildGraph` (Minh).
  - Đã chốt chữ ký chung `runEngine(src, signal?)` và `toClientResult(r)`, để engine giả của Thiện thay được bằng engine thật mà không sửa route.
  - Phiếu của Phát có **bảng hợp đồng UI ⇄ API**. Bảng ghi hàm trong `src/lib/api.ts`, endpoint, payload gửi đi, dữ liệu nhận về, phiếu server tương ứng, cùng danh sách action cố định của store `src/store/workbench.ts`.
  - Mọi **Prompt giao agent** viết lại theo đúng 4 câu: đọc spec + contracts ⇒ file + export + chữ ký ⇒ luồng + phần bỏ qua + chỗ không khóa người dùng ⇒ bẫy + lệnh tự kiểm. Phiếu sửa lỗi sau đóng băng dùng mẫu 4 câu ở luật chung 13 (`02_PHIEU_THIEN.md`).
  - Đã xóa mọi cụm "repo tập", "code cũ", "bản tập", "buổi tập" và tên repo tập khỏi 5 phiếu. Bẫy đã gặp được viết lại thành mô tả trực tiếp, không trỏ tới file nào không có trong repo thi.
- `03_GIT_PUSH_PULL.md` Mục 2 (mới): thư mục `docs/` và `.gitignore`, thứ tự chép (commit `.gitignore` trước, chép `docs/` sau), kiểm `git status`.
- `00_DOC_DAU_TIEN.md` Mục 1A (mới): bối cảnh repo trống, cách dùng phiếu và prompt.
- `06` Mục 4.2 sửa theo cách đặt `docs/`.
- `07_KHAO_SAT_6_GHI_CHU.md` thêm lưu ý: đường dẫn và số dòng trong file là của bản đã khảo sát, không có trong repo thi.

**Script tự kiểm** (`tu-kiem/kiem-ke-hoach.mjs`) thêm 3 tiêu chí, nâng C08:

- **C08:** prompt đủ 4 câu đúng thứ tự.
- **C21:** phiếu không còn từ cấm.
- **C22:** mọi đường dẫn `docs/...` có thật, và mọi "Mục N" ngay sau đường dẫn `docs/spec/...` có heading tương ứng trong file spec. Đã thử đổi 1 tham chiếu thành "Mục 99": script báo lỗi đúng chỗ.
- **C23:** prompt UI nhắc `prototype.html` khi phiếu dựa vào prototype.

Kết quả: lần 1 đạt **22/23** (PH-10 bị bắt nhầm ở C23 vì prototype không có phần giải thích đoạn chọn). Đã sửa điều kiện. Lần 2 đạt **23/23**. Khoảng 366 tham chiếu "Mục" tới spec được kiểm.

**Chưa làm:**

- Chưa nhờ subagent soát lại lượt 2.
- Chưa chạy thử 1 prompt nào với AI để xem code sinh ra có khớp chữ ký không.
- `docs/references/thele.md` và `docs/pitch/` chỉ được nhắc "nếu có". Đội tự quyết có mang theo trong `docs/` hay không.

## 7. Tách mỗi mã thành 1 file phiếu, prompt Claude ở đầu (07/11, lượt 3)

**Đã làm:**

- Tách 67 phiếu thành 67 file `phieu/<ten>/<MÃ>.md` (thư mục `thien`, `minh`, `nhan`, `phat`, `quy`) bằng script `tu-kiem/tach-phieu.mjs`. Script chạy 1 lần, đã chạy; chạy lại sẽ báo lỗi vì các file `02_PHIEU_*` giờ là mục lục.
- Mỗi file phiếu gồm 3 mục:
  - **Mục 1** là khối prompt dán nguyên cho Claude. Claude tự `git checkout -b <nhánh>`, đọc file phiếu, luật chung và `docs/spec/`, code theo 4 câu lõi, chạy `typecheck`, `lint`, `test`, gộp `origin/main`, commit nhỏ (không `git add -A`, không `--date`), `git push`, `gh pr create`. Claude **không tự merge**.
  - **Mục 2** là việc của người làm: chờ CI, thử tay, tự bấm "Create a merge commit". PR sửa `src/contracts/*` thì Thiện merge.
  - **Mục 3** là chi tiết phiếu như cũ.
- Phân loại phiếu:
  - 52 phiếu Claude làm.
  - TH-01 dùng prompt riêng: Thiện tự chạy `create-next-app` và thêm `docs/` vào `.gitignore` trước, Claude đẩy thẳng lên `main`.
  - 6 phiếu dùng prompt mẫu sửa lỗi (điền lỗi rồi mới dán, PR nhãn `fix-demo`).
  - 9 phiếu ghi rõ "KHÔNG dùng Claude" (deploy, rollback, đóng băng, bàn giao, slide, duyệt tay, ghi bundle, áp phích).
- 5 file `02_PHIEU_<TEN>.md` thành mục lục: giữ phần đầu (luật chung, bảng hợp đồng UI ⇄ API), thêm bảng Mã · Tên việc · Giờ · Cách làm có link tới từng file.
- `03_GIT_PUSH_PULL.md`: Claude làm phần git; **mỗi người tự merge PR của mình** (thay cho việc Thiện merge hết); PR contracts do Thiện merge (00:30–03:30 là Nhân); bỏ "cửa sổ merge".
- Luật chung 14 trong `02_PHIEU_THIEN.md` mô tả cách làm mỗi phiếu với Claude.
- `00_DOC_DAU_TIEN.md` Mục 1A: chỉ đường tới thư mục phiếu.
- `06` Mục 4.2:
  - Thêm việc mỗi máy cài Claude Code, `gh auth login` bằng tài khoản của chính mình.
  - Nhãn `fix-demo`, `sau-dong-bang` tạo lúc 13:00 trong TH-03, **không** tạo trước giờ thi, vì repo phải trống khi BTC kiểm.

**Script tự kiểm** giờ đọc cả 67 file phiếu:

- **C05:** chỉ cho phép 1 khối `text` chứa prompt.
- **C13:** link tương đối tính theo thư mục của từng file.
- **C21:** quét từ cấm trên cả 67 file.
- **C24 (mới):** tiêu đề khớp tên file; prompt có đủ lệnh tạo nhánh đúng tên, push, `gh pr create`, "KHÔNG tự merge", đường dẫn file phiếu, lệnh kiểm, cấm `git add -A` và `--date`; PR contracts của người khác Thiện phải để Thiện merge.

Kết quả: lần 1 đạt 22/24 (QU-08 có tên nhánh dạng mẫu; 2 đường dẫn ví dụ `docs/...` trong báo cáo bị bắt nhầm). Đã sửa script. Lần 2 đạt **24/24**.

**Chưa làm:**

- Chưa thử dán 1 prompt vào Claude để chạy thật.
- Chưa kiểm Claude Code trên máy các bạn có được phép chạy `git push`, `gh pr create` không. Lần đầu Claude sẽ hỏi quyền, cần bấm cho phép.
- Chưa nhờ subagent soát lượt 3.
