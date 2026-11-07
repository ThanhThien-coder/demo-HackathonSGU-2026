# 03 — Git: nhánh, PR, thứ tự push/pull, quyền merge

> Áp dụng cho repo thi. Luật thi ở `docs/references/thele.md` Mục VII.2. Vi phạm là bị hủy tư cách thi.

## 1. Luật cứng, không ngoại lệ

1. Repo thi **public, trống hoàn toàn** khi BTC kiểm. Tạo repo **không** tick README, license, `.gitignore`.
2. Cả 5 người là Collaborator, và ai cũng có commit code thật.
3. Chỉ commit trong giờ thi, từ 12:00 07/11 tới 09:00 08/11. **Cấm push hàng loạt code chuẩn bị trước.**
4. **Không chép code của repo tập dượt sang repo thi**, dù chép nguyên file hay chia nhỏ ra nhiều commit. Chia nhỏ code cũ để lịch sử commit trông tự nhiên cũng là vi phạm.
5. Mỗi người commit bằng **chính tài khoản của mình**, không commit hộ, không đặt `Co-authored-by` thay người khác.
6. Không mạo danh, không sửa thời gian commit. Cấm `--date`, cấm `GIT_COMMITTER_DATE`, cấm `--amend` để sửa giờ, cấm `rebase` để đổi lịch sử đã push.
7. Không commit: thư mục `docs/` (chứa `docs/spec/`, `docs/ke-hoach-thi/`, `docs/prototype.html`), `.kb/`, `.env*` (trừ `.env.example`), `AGENTS.md`, `CLAUDE.md`. Không dùng `git add -f`.
8. Commit nhỏ, khoảng **200 dòng trở xuống**, message rõ nghĩa: `feat(engine): cắt link về gốc repo`, `fix(ai): …`, `test(…)`, `chore(…)`.

## 2. Thư mục `docs/` và `.gitignore` (bắt buộc, làm đúng thứ tự)

Lúc bắt đầu thi, repo thi **chưa có `src/`, chưa có file code nào**. Mỗi người đặt thư mục `docs/` ngay trong repo thi để AI đọc làm kim chỉ nam. `docs/` gồm:

- `docs/spec/` (toàn bộ đặc tả),
- `docs/ke-hoach-thi/` (bộ kế hoạch này, gồm các phiếu `02_PHIEU_<TEN>.md`),
- `docs/prototype.html` (bản vẽ giao diện),
- nếu có: `docs/references/thele.md`, `docs/pitch/` (cho slide).

**`docs/` phải nằm trong `.gitignore` ngay từ commit đầu**, để vừa để sẵn trong repo cho AI đọc, vừa không bị commit nhầm lên GitHub:

1. 12:00, Thiện (TH-01): clone repo thi trống ⇒ chạy `create-next-app` khi thư mục **chỉ có `.git`** ⇒ viết `.gitignore` có các dòng `docs/`, `.kb/`, `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.env*`, `!.env.example` ⇒ commit, push ⇒ **sau đó** mới chép thư mục `docs/` vào.
2. 12:20, 4 người còn lại: `git pull` (đã có `.gitignore`) ⇒ **sau đó** mới chép `docs/` vào thư mục repo thi trên máy mình.
3. Kiểm ngay: `git status` không được hiện `docs/`. Nếu hiện thì dừng, không commit, báo Thiện.
4. Không bao giờ dùng `git add -f` hay `git add docs`.

### 2.1. Chuẩn bị trên mỗi máy (trước 11:30)

- `git config user.name` và `git config user.email` đúng tài khoản GitHub của chính mình. Email phải đã xác minh trên GitHub, nếu không thì commit không hiện tên trong danh sách Contributors.
- Clone repo thi **vào một thư mục mới, trống**. Agent chỉ được mở thư mục repo thi. Trong thư mục này không có file code nào từ trước.
- Chuẩn bị sẵn bản chép của thư mục `docs/` ở chỗ khác trên máy (ổ USB hoặc thư mục riêng), để chép vào repo thi theo đúng thứ tự ở Mục 2.
- Đăng nhập `gh` (nếu dùng) bằng tài khoản của mình.

## 3. Nhánh và PR

- **Một phiếu = một nhánh = một PR.** Tên nhánh `<ten>/<ma-phieu>`, chữ thường: `thien/th-05`, `minh/mi-03`, `nhan/nh-07`, `phat/ph-08`, `quy/qu-03`. Sửa lỗi sau đóng băng: `<ten>/fix-<mô-tả>`.
- **Claude làm phần git:** prompt ở Mục 1 của mỗi file `phieu/<ten>/<MÃ>.md` bảo Claude tự `git checkout -b`, commit nhỏ, `git push`, `gh pr create`. Claude **không** tự merge. Mỗi máy phải cài sẵn `gh` và đã `gh auth login` bằng tài khoản của chính người đó (commit và PR mang tên người đó).
- **Người làm tự merge PR của mình** khi CI xanh và đã thử tay theo "Tiêu chí đạt". Ngoại lệ: PR sửa `src/contracts/*` (TH-02, MI-01, NH-01, và mọi thay đổi contracts sau 13:00) do Thiện bấm merge.
- Mỗi PR có: mã phiếu trong tiêu đề, danh sách file đã sửa (phải nằm trong "File được sửa" của phiếu), kết quả 3 lệnh kiểm, cách thử tay.
- **Kiểu merge: "Create a merge commit".** Không dùng "Squash and merge" vì gộp nhiều commit thành 1 commit lớn, trông như bulk commit. Không dùng "Rebase and merge" vì GitHub viết lại commit.
- CI (`ci.yml`) phải xanh trước khi merge. PR đỏ thì chủ PR sửa, người merge không sửa hộ.
- Sau 04:00 chỉ merge PR nhãn `fix-demo` (lỗi chặn demo) hoặc `sau-dong-bang` (bundle Offline, sửa hiển thị nhỏ của mảng độc lập, test hồi quy, README, commit cuối). Không loại nào được thêm tính năng.
- PR nằm trên đường găng được merge ngay khi CI xanh, không chờ cửa sổ merge.

## 4. Thứ tự push/pull

| Lúc | Ai | Làm gì |
| :-- | :-- | :-- |
| 12:00 | Thiện | Push commit đầu (TH-01) lên `main`. Nhắn cả đội "đã push" |
| 12:20 | 4 người còn lại | `git pull` về `main`, `npm ci`, tạo nhánh phiếu đầu của mình |
| 12:20–13:00 | Cả 5 | Claude mở PR phiếu đầu. Thiện merge MI-01, NH-01 (contracts) trước để TH-02 viết `index.ts`; Phát, Quý tự merge PH-01, QU-01 khi CI xanh; Thiện merge TH-02 cuối cùng |
| Mỗi khi có PR xanh | Chủ PR | Tự merge PR của mình (PR contracts: Thiện; 00:30–03:30: Nhân). Nhắn nhóm "đã merge <mã>" |
| Ngay sau mỗi đợt merge | Ai đang làm phiếu | `git pull` từ `main` vào nhánh của mình (merge `main` vào nhánh, không rebase nhánh đã push) |
| Trước khi mở PR | Chủ PR | Pull `main` mới nhất, chạy lại 3 lệnh kiểm |
| 04:00 | Thiện | Đóng băng. Nhắn cả đội. Từ giờ chỉ PR `fix-demo` và `sau-dong-bang` |
| 08:30–08:45 | Cả 5 | Push hết việc còn lại (commit cuối), mở PR, tự merge khi CI xanh. **09:00 dừng mọi push** |

Khi 2 người cần cùng 1 file: không làm song song. Người giữ file làm xong, merge, rồi mới **bàn giao** (ghi trong PR "bàn giao `<file>` cho `<mã phiếu>`"). Các lần bàn giao đã lên lịch:

| File | Từ | Sang | Lúc |
| :-- | :-- | :-- | :-- |
| `src/app/layout.tsx`, `src/app/globals.css` | TH-01 | PH-01 | 12:20 |
| `src/app/page.tsx` | TH-01 | PH-04 | 12:20 |
| `src/app/page.tsx`, `src/components/home/*` | PH-04 | TH-13 | 22:00 |
| `src/contracts/engine.ts`, `engine-internal.ts`, `ai.ts`, `learner.ts` | MI-01, NH-01 | Thiện | 13:00 |

## 5. Quyền merge

- **Mỗi người tự merge PR của mình** (cả 5 là Collaborator có quyền `Write`, đủ để merge).
- **PR sửa `src/contracts/*`:** Thiện merge; từ 00:30 tới 03:30 khi Thiện ngủ là **Nhân**. Trước giờ thi, chủ repo cấp cho Nhân quyền `Maintain`.
- **Sau 04:00:** chỉ PR nhãn `fix-demo` hoặc `sau-dong-bang` được merge; Thiện xem qua trước khi chủ PR bấm merge.
- Người giữ quyền dự phòng (Nhân) chỉ merge PR contracts khi đủ 3 điều kiện: CI xanh, chủ phiếu đã tự kiểm theo "Tiêu chí đạt", không đụng `src/contracts/*`. PR đụng contracts chờ Thiện dậy. Ngoại lệ duy nhất: Nhân được tự sửa 1 dòng `CONFIG.PROMPT_VERSION` trong `src/contracts/config.ts` khi chỉnh prompt ban đêm (NH-08, NH-11), trong 1 commit riêng `chore(contracts): đổi PROMPT_VERSION`.
- Không bật branch protection bắt buộc review. Cài này dễ chặn cả đội khi người duyệt đang ngủ. CI xanh là đủ.

## 6. Kiểm lịch sử commit

- **13:00:** `git shortlog -sn` trên `main` ⇒ đủ 5 tên.
- **Mỗi lần merge:** xem nhanh `git log --oneline -10`. Commit quá to (hơn khoảng 400 dòng) thì nhắc chủ PR lần sau chia nhỏ hơn.
- **08:45 (lệnh kiểm duy nhất cho phần commit cuối):** chạy `git log --since="2026-11-07 12:00" --format="%an" | sort | uniq -c` ⇒ đủ 5 tên, mỗi tên nhiều commit. Rồi chạy `git log --since="2026-11-08 00:00" --format="%an %ad" --date=iso` ⇒ cả 5 người có commit sau nửa đêm (cả 5 đều làm việc sau 00:00 theo lịch). Không ai phải commit thêm chỉ để có tên lúc cuối; chỉ commit khi có việc thật.
- **09:00:** không còn PR nào đang chờ merge. Commit sau 09:00 không được tính.
