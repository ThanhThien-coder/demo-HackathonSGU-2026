# Đề xuất: cấu trúc context cho AI (Opus đầu não + Antigravity thợ)

> File nháp, chưa track. Nhóm duyệt xong thì Claude làm và xóa file này. Ngày 29/10/2026.

## 1. Trạng thái lúc ghi (16:3x)

- **TASK_03** (Antigravity): xong 30, 22, 10, 11 và 2 file chỉ mục trong archive; còn `spec/20`. Có script canh chạy nền: khi xong, Claude tự kiểm → commit 7 file → xóa `TASK_03_cau_truc_spec.md` → báo cáo.
- **TASK_04** (Antigravity, phiên thứ 2, song song): nghiên cứu có nguồn rồi viết `spec/04_KIEN_TRUC_TRIEN_KHAI.md` + `pitch/KIEN_TRUC_BGK.md`. Xong thì tạo `DONE_TASK_04`. Claude kiểm nhưng **không tự commit** — chờ nhóm duyệt.
- **Không xóa** `C:/Users/Admin/Desktop/hackathon-2026-tools` dù việc gốc bảo xóa: TASK_04 và các task sau còn dùng. Đề xuất chuyển vào `.ai/tools/` (xem dưới).
- Script canh chỉ chạy khi máy và VS Code còn mở. Nếu đã tắt: nhắn Claude "kiểm task 3" / "kiểm task 4".

## 2. Cấu trúc đề xuất

```
AGENTS.md                    ← NGUỒN CHUNG cho mọi AI (≤ 4 KB)
CLAUDE.md                    ← "@AGENTS.md" + vai đầu não (≤ 1,5 KB)
.agents/rules/00_chung.md    ← Antigravity: "Đọc AGENTS.md" + vai thợ (≤ 1 KB)
.gitignore                   ← MỚI (repo chưa có)
.ai/
  TASK_TEMPLATE.md           ← khuôn task cố định
  tools/                     ← mmcheck, preserve, refcheck (chuyển từ hackathon-2026-tools)
  tasks/                     ← gitignore: TASK_xx.md, TASK_xx.report.md, DONE_xx
spec/  pitch/  references/  archive/   ← giữ nguyên
```

| File | Có gì | Không có gì |
| :-- | :-- | :-- |
| `AGENTS.md` | Sản phẩm 1 đoạn; bản đồ thư mục; luật cứng (một sự thật một chỗ, INV, không hứa 100%, tiếng Việt); lệnh kiểm; bảng "cần X → đọc file nào, mục nào"; **"không đọc `archive/`, `prototype/` trừ khi task chỉ định"** | Nội dung spec (chỉ trỏ) |
| `CLAUDE.md` | Vai đầu não: lập kế hoạch, viết task theo khuôn, kiểm bằng script thay vì đọc lại cả file, được commit | Luật chung (đã import) |
| `.agents/rules/00_chung.md` | Vai thợ: chỉ ghi file trong phạm vi task; cấm lệnh git ghi; báo cáo vào file; xong tạo DONE | |
| `TASK_TEMPLATE.md` | Mục tiêu · File được ghi · Đọc gì (file + mục) · Các bước · Luật nghiên cứu (phải có nguồn) · Lệnh kiểm + điều kiện đạt · Mẫu báo cáo · File DONE | |

**Vòng làm việc:** Opus viết `.ai/tasks/TASK_xx.md` → Antigravity làm, ghi `TASK_xx.report.md` + `DONE_xx` → script canh đánh thức Opus → Opus chỉ đọc báo cáo + `git diff --stat` + kết quả script → commit → xóa task.

**Vì sao:** file AI luôn nạp chỉ ~6 KB; luật chung ở một chỗ, sửa một lần cả hai AI cùng thấy; task/báo cáo không vào git ⇒ không thêm "md hell".

## 3. `.gitignore`

```gitignore
# Trao đổi Opus ↔ Antigravity (xong việc là xóa)
.ai/tasks/
DONE_*
/TASK_*.md

# Worktree lạc
.claude/worktrees/
.claude/settings.local.json

# Hệ điều hành
Thumbs.db
.DS_Store
```

Không làm file ignore riêng cho AI (`.geminiignore`, deny trong `.claude/settings.json`) ở repo này — dùng luật trong `AGENTS.md` cho linh hoạt (`archive/` 5,6 MB đôi khi vẫn cần kiểm).

## 4. Repo thi (31/10)

- Cùng khung trên + `lệnh npm`, quy ước commit; mỗi module lớn có `AGENTS.md` ~1 KB trỏ spec (`src/server/engine/` → `10`, `11`; `src/server/ai/` → `20`, `21`; …).
- `.gitignore` của `create-next-app` + 3 dòng `.ai/tasks/`, `DONE_*`, `/TASK_*.md`.
- **Chặn cứng `.env*`** (chứa Gemini key, Supabase service-role key): `.claude/settings.json` `"deny": ["Read(./.env*)"]` + luật trong `AGENTS.md` cho Antigravity.
- Kiểm `references/thele.md`: các file tài liệu này có được commit ở H+0 không.

## 5. Chưa kiểm chứng

Antigravity đọc luật ở đâu — mới có blog bên thứ ba, chưa có docs chính thức: `.agents/rules/` (cũ: `.agent/rules/`), `AGENTS.md` gốc từ khoảng v1.20.3, `GEMINI.md` có thể ưu tiên hơn. ⇒ Rule file chỉ **trỏ** sang `AGENTS.md`, không tạo `GEMINI.md`. Sau khi tạo: hỏi Antigravity "đang nạp những rule nào" để thử.

Nguồn: [thepromptshelf.dev](https://thepromptshelf.dev/blog/google-antigravity-agents-md-rules-guide-2026) · [agentpedia.codes – guide](https://agentpedia.codes/blog/antigravity-agents-md-guide) · [agentpedia.codes – rules](https://agentpedia.codes/blog/antigravity-rules-examples) · [aiengineerguide.com](https://aiengineerguide.com/til/make-antigravity-use-agents-md-automatically/)

## 6. Cần nhóm chốt

1. Đồng ý cấu trúc ở Mục 2–3? (Có ⇒ Claude làm sau khi TASK_03 commit.)
2. Chuyển tools vào `.ai/tools/` thay vì xóa?
3. TASK_04 đang theo 2 mặc định: bản thi **không dùng queue ngoài**; **host do nghiên cứu đề xuất** (ghi ở `spec/00` Mục 2 "chờ xác nhận"). Đồng ý?
4. Việc ngoài repo chưa ai nhận: áp phích (10% điểm), tạo tài khoản Supabase / Gemini / host và thử gọi Gemini (`spec/40` Mục 1), chia vai 5 người, hỏi BTC Q-02b.
