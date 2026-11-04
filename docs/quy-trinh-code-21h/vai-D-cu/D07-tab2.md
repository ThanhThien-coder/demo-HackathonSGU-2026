# D07 — Tab Feynman

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 20:00–22:00 (H+8 → H+10) |
| Nhánh | `d/D07-tab2` |
| Cần có trước | D06, E04 (`similarity`); A08 (`enrich-node`, xong 22:00; trong lúc chờ thì dùng fixture câu hỏi của Vai E) |
| Mở đường cho | D08 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D07-tab2
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D07 — Tab Feynman". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: D06, E04 (`similarity`); A08 (`enrich-node`, xong 22:00; trong lúc chờ thì dùng fixture câu hỏi của Vai E). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `.kb/spec/30_UI.md` Mục 6.2, Test bắt buộc T6, T8, T9, T10, T11, T16, T25
- `.kb/spec/02_CONTRACTS.md` Mục 1, 6, 8, 10
- `.kb/spec/00_QUYET_DINH.md` D-36
- `package.json`
- `src/`

## Được ghi
- `src/components/cockpit/FeynmanTab.tsx`
- `src/components/cockpit/QuestionCard.tsx`
- `src/components/cockpit/AnswerBox.tsx`
- `src/components/cockpit/HintCard.tsx`
- `src/components/cockpit/RevealPanel.tsx`
- `src/components/cockpit/SkillChangeChip.tsx`
- `src/components/cockpit/RunSummary.tsx`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết danh sách câu `QuestionCard.tsx`, ô trả lời `AnswerBox.tsx`, kiểm trước khi gửi (UI-52: `CONFIG.ANSWER_MIN_CHARS`, `CONFIG.ANSWER_MAX_CHARS`, `CONFIG.ANSWER_DUPLICATE_SIMILARITY`), khóa nút nộp theo `CONFIG.SUBMIT_DEBOUNCE_MS`, phím tắt `Ctrl+Enter` (`.kb/spec/30_UI.md` Mục 6.2).
3. Viết hiển thị kết quả chấm, thẻ gợi ý `HintCard.tsx` (`CODE_POINTER` cuộn Monaco), đáp án khi câu xong trong `RevealPanel.tsx` (UI-54), chip điểm `SkillChangeChip.tsx`, và nút "Bỏ qua câu này" (`.kb/spec/30_UI.md` Mục 6.2).
4. Viết tổng kết run `RunSummary.tsx` (UI-57) và giao diện node đã xong trong `FeynmanTab.tsx` (UI-58) (`.kb/spec/30_UI.md` Mục 6.2).
5. Xử lý các ca của `.kb/spec/30_UI.md` Test bắt buộc: T16 (hai tab cùng câu: tab sau hiện toast "Câu này vừa được nộp ở tab khác", cập nhật lượt, giữ nội dung ô), T25 (`progress.tokens_used ≥ CONFIG.SESSION_TOKEN_QUOTA` thì ô và nút Nộp tắt, "Bỏ qua câu này" vẫn chạy).
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npm run build`
- Không có `reference_answer` trong store hay Network trước khi câu xong (`.kb/spec/30_UI.md` T10).
- Nút "Bỏ qua câu này" có xác nhận trước khi gửi request (`.kb/spec/30_UI.md` T11).

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D07 — Tab Feynman" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npm run build` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Thử nghiệm T6: nộp câu trả lời quá ngắn (dưới `CONFIG.ANSWER_MIN_CHARS`) hoặc trùng câu cũ, lỗi báo ngay dưới ô và không phát sinh request mạng nào.
- [ ] Thử nghiệm T8: click nút Nộp 2 lần nhanh chỉ sinh ra đúng 1 request `evaluate-feynman`.
- [ ] Thử nghiệm T9: trượt lượt 2 (gợi ý `CODE_POINTER`) thì Monaco cuộn tới đúng bước, có vạch tím.

- [ ] Thử T16 (mở 2 tab cùng câu, nộp lần lượt) và T25 (hết hạn mức token) của `.kb/spec/30_UI.md`.
```text
Task "D07 — Tab Feynman" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/components/cockpit/AnswerBox.tsx src/components/cockpit/QuestionCard.tsx
git commit -m "feat(ui): ô trả lời, kiểm trước khi gửi"
git add src/components/cockpit/HintCard.tsx src/components/cockpit/RevealPanel.tsx src/components/cockpit/SkillChangeChip.tsx
git commit -m "feat(ui): kết quả chấm, gợi ý, đáp án"
git add src/components/cockpit/FeynmanTab.tsx src/components/cockpit/RunSummary.tsx
git commit -m "feat(ui): tổng kết run"
git pull --rebase origin main
git push -u origin d/D07-tab2
gh pr create --base main --title "D07 — Tab Feynman" --body "Closes #<số Issue>"
```

Báo Vai A review và merge. Vai A merge khi CI xanh.

## Tiếp theo

→ [D08](D08-offline.md)
