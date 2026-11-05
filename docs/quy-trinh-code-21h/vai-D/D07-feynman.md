# D07 — Trả lời Feynman

Làm xong phiếu này, người học có thể thực hành trả lời các câu hỏi kỹ năng bằng kỹ thuật Feynman, nhận gợi ý tương tác, xem điểm số và kết quả chấm bài chi tiết kèm đáp án mở khóa.

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 20:00–22:00 (H+8 → H+10) |
| Nhánh | `d/D07-feynman` |
| Cần có trước | D06, E04 (`similarity`); A08 (`enrich-node`, xong 22:00; trong lúc chờ thì dùng fixture câu hỏi của Vai E) |
| Mở đường cho | D08 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

**Cách nhanh:** nhắn AI `Làm phiếu D07`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D07-feynman
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D07 — Trả lời Feynman". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: D06, E04 (`similarity`); A08 (`enrich-node`, xong 22:00; trong lúc chờ thì dùng fixture câu hỏi của Vai E). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/30_UI.md` Mục 6.2, Test bắt buộc T6, T8, T9, T10, T11, T16, T25
- `docs/spec/02_CONTRACTS.md` Mục 1, 6, 8, 10
- `docs/spec/00_QUYET_DINH.md` D-36
- `package.json`
- `src/`

## Được ghi
- `src/app/learn/components/FeynmanQuestionSection.tsx`
- `src/app/learn/components/SubmitEvaluationDialog.tsx`
- `src/app/learn/components/SkipConfirmDialog.tsx`
- `src/app/learn/components/RunSummary.tsx`
- `src/store/workbench.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết khu vực câu hỏi Feynman `src/app/learn/components/FeynmanQuestionSection.tsx` gồm danh sách thẻ câu hỏi, ô nhập câu trả lời kiểm tra độ dài (`CONFIG.ANSWER_MIN_CHARS`, `CONFIG.ANSWER_MAX_CHARS`), kiểm trùng câu qua `similarity` (`CONFIG.ANSWER_DUPLICATE_SIMILARITY`), debounce nút nộp theo `CONFIG.SUBMIT_DEBOUNCE_MS`, phím tắt `Ctrl+Enter` (`docs/spec/30_UI.md` Mục 6.2, UI-52).
3. Viết hộp thoại hiển thị kết quả chấm bài `src/app/learn/components/SubmitEvaluationDialog.tsx` hiển thị kết quả chấm, thẻ gợi ý (`CODE_POINTER` cuộn Monaco), đáp án khi câu xong (UI-54), và chip điểm kỹ năng. Tuyệt đối không có `reference_answer` trong store hay request trước khi câu xong (T10).
4. Viết hộp thoại xác nhận bỏ qua câu hỏi `src/app/learn/components/SkipConfirmDialog.tsx` yêu cầu người dùng xác nhận trước khi gửi request bỏ qua (T11).
5. Viết tổng kết lượt học `src/app/learn/components/RunSummary.tsx` (UI-57) và giao diện node đã hoàn thành trong `FeynmanQuestionSection.tsx` (UI-58).
6. Xử lý các ca kiểm thử: T16 (hai tab cùng câu: tab sau báo toast "Câu này vừa được nộp ở tab khác", cập nhật lượt, giữ nội dung ô), T25 (khi `progress.tokens_used ≥ CONFIG.SESSION_TOKEN_QUOTA` thì ô và nút Nộp bị khóa, nút "Bỏ qua câu này" vẫn bấm được).
7. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.


**Bắt buộc theo bản chạy thử** (chi tiết lỗi ở `docs/quy-trinh-code-21h/loi-can-sua.md`):
- **Lộ đáp án (lỗi D-12, `30` Mục 6.2):** đang trả lời thì thu gọn giải thích từng bước ở X-Ray, vẫn hiện code; nộp xong mở lại.
- **Cửa sổ kết quả (lỗi D-05):** tách nút thành chân cửa sổ, thân cuộn.
- **Giống 100% (lỗi D-13):** sửa hẳn câu trả lời rồi nộp lại, % phải giảm.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npm run build`
- Không có `reference_answer` trong store hay Network trước khi hoàn thành câu hỏi (T10).
- Nút "Bỏ qua câu này" bật modal xác nhận `SkipConfirmDialog` trước khi gửi request (T11).
- Kiểm tra độ dài câu trả lời và trùng lặp báo lỗi ngay tại client không gửi request (T6). Khóa nút nộp chống bấm đúp (T8).
- Xử lý đúng token quota T25 và đồng bộ hai tab T16.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/server/`, `src/app/api/`, `src/app/auth/`, `src/contracts/*`.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không commit file làm việc của agent (`.agents/`, prompt nháp) và ảnh không dùng.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D07 — Trả lời Feynman" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npm run build` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Thử nghiệm T6: nộp câu trả lời quá ngắn (dưới `CONFIG.ANSWER_MIN_CHARS`) hoặc trùng câu cũ, lỗi báo ngay dưới ô và không phát sinh request mạng nào.
- [ ] Thử nghiệm T8: click nút Nộp 2 lần nhanh chỉ sinh ra đúng 1 request `evaluate-feynman`.
- [ ] Thử nghiệm T9: trượt lượt 2 (gợi ý `CODE_POINTER`) thì Monaco cuộn tới đúng bước, có vạch tím.
- [ ] Thử T16 (mở 2 tab cùng câu, nộp lần lượt) và T25 (hết hạn mức token) của `docs/spec/30_UI.md`.
- [ ] Đang trả lời không chép được Luồng thực thi; nộp xong xem lại được.
- [ ] Ở 1366×768, cửa sổ kết quả thấy đủ tiêu đề và nút (T36).

```text
Task "D07 — Trả lời Feynman" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/app/learn/components/FeynmanQuestionSection.tsx
git commit -m "feat(ui): khu vực câu hỏi feynman và kiểm tra đầu vào"
git add src/app/learn/components/SubmitEvaluationDialog.tsx src/app/learn/components/SkipConfirmDialog.tsx
git commit -m "feat(ui): hộp thoại kết quả chấm và xác nhận bỏ qua"
git add src/app/learn/components/RunSummary.tsx src/store/workbench.ts
git commit -m "feat(ui): tổng kết lượt học feynman"
git pull --rebase origin main
git push -u origin d/D07-feynman
gh pr create --base main --title "D07 — Trả lời Feynman" --body "Closes #<số Issue>"
```

Báo Vai A review và merge. Vai A merge khi CI xanh.

## Tiếp theo

→ [D08](D08-offline.md)
