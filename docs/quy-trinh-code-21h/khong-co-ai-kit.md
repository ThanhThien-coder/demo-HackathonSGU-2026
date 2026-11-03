# Làm phiếu khi máy không có Antigravity hoặc không có ai-kit

Đọc chung: [README tổng](README.md). Phiếu của mọi vai viết cho máy có đủ ai-kit và Antigravity (agy). File này là cách làm **cùng phiếu đó** trên máy thiếu công cụ, để kết quả vẫn giống máy khác: cùng file được sửa, cùng tiêu chí, cùng commit.

## 1. Máy bạn thuộc trường hợp nào

| Trường hợp | Máy có gì | Làm theo |
| :-- | :-- | :-- |
| **Đủ** | ai-kit + Claude Code + agy | Phiếu như đã viết, không cần đọc file này |
| **1** | ai-kit + Claude Code, **không có agy** | Mục 3 |
| **2** | Chỉ có Claude Code, **không có ai-kit** | Mục 4 |

ai-kit **không cần** tài khoản Antigravity: chỉ cần Git, Node.js 18 trở lên và Claude Code (`BAT_DAU.md` của ai-kit, Bước 1). Thiếu agy thì chỉ mất lệnh `ak giao`, còn các skill `tao-task`, `kiem-task`, `doc-spec`, `kiem-contract` và các lệnh `ak task`, `ak xong`, `ak lai`, `ak bat-dau` vẫn chạy. Vì vậy **ưu tiên Trường hợp 1**: nhờ chủ repo `ai-kit` mời vào repo (repo đang để riêng tư), cài theo `BAT_DAU.md`. Chỉ dùng Trường hợp 2 khi không cài được.

Claude ở đây là **Claude Code** (dòng lệnh hoặc tiện ích VS Code), vì phải đọc, ghi file và chạy lệnh trong repo thi. Claude trên web không làm được phiếu.

## 2. Nguyên tắc chung cho cả hai trường hợp

1. **Phiếu là chuẩn chung.** Không tự viết lại các mục Được đọc, Được ghi, Việc cần làm, Tiêu chí xong, Cấm. Không bỏ ô nào ở Bước 3. Chỉ Bước 1 và Bước 2 làm khác, theo bảng ở Mục 3 hoặc Mục 4.
2. **AI không bao giờ `git add`, commit, push hay merge.** Bước 3 và Bước 4 bạn tự làm y như phiếu.
3. **Mỗi phiếu một chat mới.** Kiểm ở một chat khác với chat đã làm, để chat kiểm không bênh việc của chính nó.
4. **Chỉ sửa đúng file của mình.** Không có agy nên không có rào quyền tự động, nên trước khi commit `git status` phải chỉ có các file ở mục Được ghi. Thấy file khác bị sửa thì không commit file đó, hỏi chủ file (bảng sở hữu ở README tổng Mục 3).
5. **Đặt rào quyền cho Claude** (Mục 5) để Claude không tự commit hay đọc `.env`, kể cả khi bạn lỡ bấm đồng ý.
6. **Phiếu agy chạy lúc bạn ngủ** (A11 của Vai A, D09 của Vai D): trước khi ngủ, dán prompt Bước 2 cho Claude Code, chuyển sang chế độ tự chấp nhận sửa file (bấm `Shift+Tab` tới "accept edits"). Lệnh kiểm đã có trong danh sách cho phép ở Mục 5 nên Claude chạy tiếp được; lệnh khác sẽ dừng chờ, dậy thì duyệt tiếp. **Không** dùng `--dangerously-skip-permissions`.
7. **Quá 30 phút chưa xong** thì dừng Claude, chia việc theo các nhóm commit ở Bước 4 của phiếu, làm từng phần (giống luật của agy).
8. **Đầu giờ thi, nhắn Vai A** máy bạn thuộc trường hợp nào, để Vai A tính thời gian: Claude tự làm thường chậm hơn giao agy vì bạn phải ngồi duyệt.

## 3. Trường hợp 1: có ai-kit, không có agy

Chỉ đổi **Bước 2** của các phiếu ghi "Giao agy" (phiếu dạng A). Bước 0, 1, 3, 4 giữ nguyên, kể cả `ak xong` và `ak lai`.

Thay prompt Bước 2 bằng hai prompt dưới (giống phiếu dạng B):

```text
Không giao agy cho task "<MÃ> — <tên phiếu>" vì máy không có agy. Bạn tự làm đúng mục Việc cần làm của task, rồi tự kiểm theo Tiêu chí xong. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push. Báo lại: các lệnh đã chạy và kết quả (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa.
```

Rồi mở **chat Claude mới** và dán:

```text
Dùng skill kiem-task kiểm task "<MÃ> — <tên phiếu>": chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push. Chỉ báo lại kết quả.
```

Prompt làm lại ở Bước 3 giữ nguyên như phiếu. Vẫn đặt rào quyền ở Mục 5.

## 4. Trường hợp 2: chỉ có Claude Code

### 4.1. Chuẩn bị trước ngày thi (một lần)

1. Cài Claude Code, đăng nhập. Clone repo thi và repo tài liệu về máy.
2. Chép tài liệu vào `.kb/` của repo thi (thay cho `ak bat-dau` và `gan-du-an.mjs`):

```powershell
$tl  = "<đường dẫn repo tài liệu>"
$thi = "<đường dẫn repo thi>"
Remove-Item -Recurse -Force "$thi\.kb\spec", "$thi\.kb\doc-de-hieu" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force "$thi\.kb\tasks" | Out-Null
Copy-Item -Recurse "$tl\spec" "$thi\.kb\spec"
Copy-Item -Recurse "$tl\doc-de-hieu" "$thi\.kb\doc-de-hieu"
```

   Tài liệu gốc đổi thì chạy lại khối lệnh này.
3. Nhận `.kb/README.md`, `AGENTS.md`, `CLAUDE.md` từ Vai A (`01_deploy` Mục 3.9), đặt đúng chỗ trong repo thi.
4. Cho git bỏ qua các thư mục và file chỉ có trên máy:

```powershell
cd $thi
Add-Content .git\info\exclude ".kb/"
Add-Content .git\info\exclude ".claude/"
Add-Content .git\info\exclude "AGENTS.md"
Add-Content .git\info\exclude "CLAUDE.md"
git status
```

   `git status` mà thấy `.kb`, `.claude`, `.env`, `AGENTS.md` hay `CLAUDE.md` thì dừng lại kiểm tra, chưa commit gì.
5. Đặt rào quyền theo Mục 5.

### 4.2. Đổi Bước 1 và Bước 2 của mỗi phiếu

| Bước | Máy đủ công cụ | Máy Trường hợp 2 |
| :-- | :-- | :-- |
| 0 | Tự gõ lệnh | Giữ nguyên |
| 1 | Prompt `tao-task` | Prompt **4.3** (ghi task thành file) |
| 2 | Prompt giao agy hoặc Claude tự làm, rồi `kiem-task` | Prompt **4.4** (làm), rồi prompt **4.5** ở chat mới (kiểm) |
| 3 | Ô kiểm; chưa đạt thì prompt `ak lai`; đạt thì `ak xong` | Ô kiểm giữ nguyên; chưa đạt thì prompt **4.6**; đạt thì tự sửa dòng `Trạng thái` trong file task thành `xong` |
| 4 | Tự gõ commit, PR | Giữ nguyên |

Phiếu "chỉ người làm" (dạng C) không đổi gì. Trong các prompt dưới, thay `<MÃ>` bằng mã phiếu, ví dụ `C02`.

### 4.3. Thay Bước 1: ghi task thành file

```text
Trước khi ghi task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: <dán dòng "Phiếu này cần" trong prompt Bước 1 của phiếu>. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG ghi task.

Đủ thì ghi nguyên văn phần nội dung tôi dán dưới đây vào file `.kb/tasks/<MÃ>.md`. Dòng đầu file ghi `# <MÃ> — <tên phiếu>`, dòng thứ hai ghi `Trạng thái: chưa làm`. Không thêm bớt nội dung, chưa làm gì khác. Ghi xong thì báo tôi.

<dán phần từ dòng "## Được đọc" tới hết mục "## Cấm" trong prompt Bước 1 của phiếu>
```

Mở file Claude vừa ghi, thấy khớp phiếu thì sang 4.4.

### 4.4. Thay Bước 2: Claude làm

```text
Đọc `.kb/README.md` rồi `.kb/tasks/<MÃ>.md`, làm đúng mục Việc cần làm từ đầu đến hết. Luật:
- Chỉ mở các file và mục ở Được đọc; chỉ tạo hoặc sửa file ở Được ghi.
- Gặp "Dùng skill doc-spec": tự mở đúng các mục spec ghi ở Được đọc, không đọc cả thư mục.
- Gặp "Dùng skill kiem-contract": tự so code với `.kb/spec/02_CONTRACTS.md` (tên kiểu, tên trường, mã lỗi, tên hằng `CONFIG`); lệch thì sửa code của mình, không sửa `src/contracts/`.
- Tuân thủ từng dòng ở mục Cấm.
- Chạy lệnh kiểm ở Tiêu chí xong tới khi xanh hoặc kẹt.
- KHÔNG `git add`, KHÔNG commit, KHÔNG push.
Xong thì đổi dòng Trạng thái trong file task thành `chờ kiểm` (kẹt thì ghi `kẹt` và lý do), rồi báo tôi: các lệnh đã chạy và kết quả (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

### 4.5. Kiểm ở chat mới

```text
Kiểm task `.kb/tasks/<MÃ>.md`, không sửa file nào. Chạy lại lệnh kiểm ở Tiêu chí xong, chạy `git status` và `git diff`. So từng tiêu chí và từng dòng ở mục Cấm: có file nào ngoài Được ghi bị đổi không, có con số tự đặt thay cho tên `CONFIG` không, có sửa `src/contracts/` không, có chép nguyên khối code dài từ spec không. Báo từng mục đạt hay chưa, kèm bằng chứng (dòng lệnh, đoạn diff). KHÔNG commit.
```

### 4.6. Làm lại khi chưa đạt

Dán vào chat đã làm ở 4.4:

```text
Task `.kb/tasks/<MÃ>.md` chưa đạt: <ghi lỗi bạn thấy hoặc lỗi chat kiểm báo>. Sửa đúng các lỗi này, chỉ trong các file ở Được ghi, chạy lại lệnh kiểm, báo lại như lần trước. KHÔNG commit.
```

Làm lại tối đa 1 lần; vẫn sai thì tự sửa tay.

## 5. Rào quyền cho Claude Code (cả hai trường hợp)

Tạo file `.claude/settings.local.json` ở gốc repo thi (đã bỏ qua khỏi git ở 4.1 bước 4; Trường hợp 1 thì tự thêm dòng `.claude/` vào `.git/info/exclude`):

```json
{
  "permissions": {
    "deny": [
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(git reset:*)",
      "Bash(gh pr merge:*)",
      "Read(./.env)",
      "Read(./.env.*)"
    ],
    "allow": [
      "Bash(git status)",
      "Bash(git diff:*)",
      "Bash(npx tsc:*)",
      "Bash(npx vitest:*)",
      "Bash(npm run build)",
      "Bash(npm run lint)"
    ]
  }
}
```

- `deny` chặn Claude tự `git add`, commit, push, merge, và đọc `.env`. Bạn vẫn tự gõ các lệnh git ở Bước 4 trong cửa sổ lệnh của mình.
- `allow` cho Claude chạy lệnh kiểm mà không hỏi, để phiếu chạy lúc bạn ngủ không bị dừng giữa chừng.
- Lệnh khác (cài thư viện, `curl`, `gcloud`…) Claude vẫn phải hỏi bạn trước khi chạy.

## 6. Theo dõi tiến độ khi không có `ak`

- Dòng `Trạng thái` trong `.kb/tasks/<MÃ>.md` chỉ để bạn nhớ việc của mình; máy khác không thấy.
- Việc đã xong hay chưa xem trên GitHub: Issue đã đóng, PR đã merge, CI xanh. Phiếu chưa có PR thì coi như chưa xong, đúng như máy có ai-kit.
