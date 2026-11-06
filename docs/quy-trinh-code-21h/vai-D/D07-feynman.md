# D07 — Trả lời Feynman

Làm xong phiếu này, tab Feynman ở cột phải cho người học trả lời câu hỏi kỹ năng, nhận gợi ý, xem điểm số và kết quả chấm chi tiết kèm đáp án mở khóa.

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
- `docs/spec/30_UI.md` Mục 6, 6.2
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 6: T6, T8, T9, T10, T11, T16, T25, T36, T40
- `docs/spec/02_CONTRACTS.md` Mục 1, 6, 8, 10
- `docs/spec/00_QUYET_DINH.md` D-36, D-74, D-78
- `package.json`
- `src/`

## Được ghi
- `src/components/learn/FeynmanQuestionSection.tsx`
- `src/components/learn/LearnSidePanel.tsx`
- `src/store/workbench.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết tab Feynman `src/components/learn/FeynmanQuestionSection.tsx` và gắn vào `LearnSidePanel.tsx` (có số câu chưa xong, chờ `enrich-node` thì xoay): hàng chip câu, bong bóng "AI hỏi", ô nhập câu trả lời kiểm tra độ dài (`CONFIG.ANSWER_MIN_CHARS`, `CONFIG.ANSWER_MAX_CHARS`), kiểm trùng câu qua `similarity` (`CONFIG.ANSWER_DUPLICATE_SIMILARITY`), debounce nút nộp theo `CONFIG.SUBMIT_DEBOUNCE_MS`, phím tắt `Ctrl+Enter` (`docs/spec/30_UI.md` Mục 6.2, UI-52).
3. Viết `Eval` và `Reveal` ngay trong `FeynmanQuestionSection.tsx`, hiện ngay dưới ô trả lời, không mở cửa sổ: kết quả chấm, gợi ý (`CODE_POINTER` cuộn Monaco), đáp án khi câu xong (UI-54), chip điểm kỹ năng. Tuyệt đối không có `reference_answer` trong store hay request trước khi câu xong (T10).
4. Viết hộp thoại xác nhận bỏ qua trong `FeynmanQuestionSection.tsx` bằng `Modal`, yêu cầu người dùng xác nhận trước khi gửi request bỏ qua (T11).
5. Viết tổng kết run (UI-57) và `RunReadOnly` cho node đã xong (UI-58) trong `FeynmanQuestionSection.tsx`.
6. Xử lý các ca kiểm thử: T16 (hai tab cùng câu: tab sau báo toast "Câu này vừa được nộp ở tab khác", cập nhật lượt, giữ nội dung ô), T25 (khi `progress.tokens_used ≥ CONFIG.SESSION_TOKEN_QUOTA` thì ô và nút Nộp bị khóa, nút "Bỏ qua câu này" vẫn bấm được).
7. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.


**Bắt buộc theo bản chạy thử** (chi tiết lỗi ở `docs/quy-trinh-code-21h/loi-can-sua.md`):
- **Đang trả lời (lỗi D-12, `30` Mục 6.2):** tab Feynman thay X-Ray trong cột phải, code vẫn hiện; bấm tab X-Ray để đọc lại, nháp giữ nguyên (T40).
- **Kết quả dài (lỗi D-05):** cột phải cuộn được, thấy đủ nút (T36).
- **Giống 100% (lỗi D-13):** sửa hẳn câu trả lời rồi nộp lại, % phải giảm.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npm run build`
- Không có `reference_answer` trong store hay Network trước khi hoàn thành câu hỏi (T10).
- Nút "Bỏ qua câu này" bật hộp thoại xác nhận trước khi gửi request (T11).
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
- [ ] Thử nghiệm T9: `NOVICE` trượt thì cả 2 lượt có gợi ý `CODE_POINTER`, Monaco cuộn tới đúng bước, có vạch tím. `PRACTITIONER` lượt 1 `CONCEPT` không tô bước, lượt 2 mới tô (D-74).
- [ ] Thử T16 (mở 2 tab cùng câu, nộp lần lượt) và T25 (hết hạn mức token) ở `docs/spec/50_TEST_VA_FIXTURE.md` Mục 6.
- [ ] Bấm "Bắt đầu trả lời" sang tab Feynman; bấm node khác về tab X-Ray; node chưa có bản phân tích thì tab Feynman tắt, có tooltip (T40).
- [ ] Ở 1366×768, kết quả chấm dài vẫn cuộn được trong cột phải, thấy đủ nút (T36).

```text
Task "D07 — Trả lời Feynman" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/components/learn/FeynmanQuestionSection.tsx src/components/learn/LearnSidePanel.tsx
git commit -m "feat(ui): tab feynman, kết quả chấm và tổng kết run"
git add src/store/workbench.ts
git commit -m "feat(ui): store cho lượt trả lời feynman"
git pull --rebase origin main
git push -u origin d/D07-feynman
gh pr create --base main --title "D07 — Trả lời Feynman" --body "Closes #<số Issue>"
```

Báo Vai A review và merge. Vai A merge khi CI xanh.

## Tiếp theo

→ [D08](D08-offline.md)
