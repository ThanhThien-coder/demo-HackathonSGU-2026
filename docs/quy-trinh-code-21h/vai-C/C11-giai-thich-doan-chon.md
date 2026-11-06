# C11 — Giải thích đoạn chọn, route `explain-selection`

| Mục | Nội dung |
| :-- | :-- |
| Giờ | Nếu kịp, sau C10. **Bỏ trước nếu trễ** (lộ trình mới trong `loi-can-sua.md`) |
| Nhánh | `c/C11-giai-thich-doan-chon` |
| Cần có trước | C04 (`gemini.ts`, `common.ts`), C05 (cổng gác lõi, `checkNames`), C06 (bản phân tích để dựng `<flow>`, `<node_info>`), A05 (phiên, cache, quota), kiểu `ExplainSelection*` trong `src/contracts` |
| Mở đường cho | D-23 (popover giải thích đoạn chọn của Vai D) |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

**Cách nhanh:** nhắn AI `Làm phiếu C11`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b c/C11-giai-thich-doan-chon
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "C11 — Giải thích đoạn chọn, route explain-selection". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: C04, C05, C06, A05, kiểu `ExplainSelectionRequest`, `ExplainSelectionRaw`, `ExplainSelectionResponse` trong `src/contracts`. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự viết thay phần của vai khác.

Ghi chú: route /api/explain-selection có thể do Vai A làm; nếu Vai A đã làm thì bỏ việc 4 và file route khỏi Được ghi.

## Được đọc
- `.kb/README.md`
- `docs/spec/00_QUYET_DINH.md` D-82
- `docs/spec/20_AI_GOI_VA_PROMPT.md` Mục 8, Test bắt buộc AI-38, AI-39
- `docs/spec/21_AI_KIEM_VA_DUYET.md` Mục 2 (GUARD-04 `explainScope`), Mục 12, Test bắt buộc GUARD-23
- `docs/spec/03_API_VA_LUU_TRU.md` Mục 2, Mục 3.3
- `docs/spec/02_CONTRACTS.md` Mục 1 (CONFIG phần AI), kiểu `ExplainSelection*`, mã lỗi
- `package.json`
- `src/`

## Được ghi
- `src/server/ai/explain.ts`
- `src/server/ai/prompts/explain.ts`
- `src/server/ai/guard/explain.ts`
- `src/app/api/explain-selection/route.ts`
- `src/server/ai/__tests__/explain.test.ts`
- `src/app/api/__tests__/explain-selection.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1 luồng (docs/spec/20_AI_GOI_VA_PROMPT.md Mục 8, AI-38): cắt vùng chọn từ snapshot phiên, sai ⇒ `ERR_SELECTION_INVALID`; tính `references` bằng code; tra cache `SELECTION_EXPLAIN`; đếm lượt `CONFIG.EXPLAIN_MAX_PER_SESSION` ⇒ `ERR_EXPLAIN_LIMIT`; kiểm quota; gọi AI; qua cổng gác thì ghi cache.
3. B2 prompt và schema (AI-39): các khối `<repo_info>`, `<node_info>`, `<step_info>`, `<flow>`, `<code_data>` (chỉ bước đang chọn), `<dto_data>` khi cần, `<references>`, `<forbidden_tech>`, `<skill_catalogue>`, `<selection>`; EXPLAIN_SYSTEM; EXPLAIN_SCHEMA. Không gửi câu hỏi, đáp án, câu trả lời, dữ liệu người học.
4. B3 `checkExplain` và `explainScope` (docs/spec/21_AI_KIEM_VA_DUYET.md Mục 12, GUARD-23): E1–E4, `skill` sai ⇒ `null`, cắt độ dài; trượt ⇒ `explanation = null`, không gọi lại, ghi log `guard_blocked` với `call = "explain"`.
5. B4 route POST `/api/explain-selection` theo docs/spec/03_API_VA_LUU_TRU.md Mục 2: xác thực, quyền sở hữu phiên, gọi `explainSelection`. Dùng lại hàm có sẵn trong `src/server/auth.ts`, `session.ts`, `cache.ts`, `quota.ts`, `errors.ts`, không viết lại.
6. Viết test trong `src/server/ai/__tests__/explain.test.ts` cho AI-38, AI-39, GUARD-23 trên `shop-api` (bài `slice-product-list`, bước 2). Viết test route (mock AI và DB) cho vùng chọn sai, trúng cache, hết lượt.
7. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.

**Không so lời giải thích với câu hỏi đang mở** (D-82): đây là chủ đích, không thêm bước so trùng.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/ai src/app/api/__tests__/explain-selection.test.ts`
- Test AI-38: vùng chọn sai ⇒ `ERR_SELECTION_INVALID`, 0 token; trúng cache ⇒ 0 token, không tính lượt; quá `EXPLAIN_MAX_PER_SESSION` ⇒ `ERR_EXPLAIN_LIMIT`; trượt gác ⇒ `explanation = null`, không ghi cache.
- Test AI-39: chọn `await` dòng 17 bài `slice-product-list` ⇒ `<code_data>` chỉ có bước 2, prompt không có `<question>`, `<reference_answer>`, `<student_answer>`.
- Test GUARD-23 đạt.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không dùng agent, không gọi công cụ tìm kiếm mạng.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "C11 — Giải thích đoạn chọn, route explain-selection" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa làm được.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/ai src/app/api/__tests__/explain-selection.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Test AI-38, AI-39, GUARD-23 đạt.
- [ ] Chạy AI thật trên `shop-api` 3 vùng chọn: `await` (từ khóa), `findById` (tên), cả vòng `for` (đoạn code). Đọc tay: đúng loại, bám đúng code, không có tên bịa (lỗi C-11).
- [ ] Gọi lại đúng vùng chọn vừa rồi ⇒ trả ngay từ cache, `tokens_used` không tăng.

```text
Task "C11 — Giải thích đoạn chọn, route explain-selection" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/ai/explain.ts src/server/ai/prompts/explain.ts
git commit -m "feat(ai): giải thích đoạn chọn"
git add src/server/ai/guard/explain.ts src/server/ai/__tests__/explain.test.ts
git commit -m "feat(guard): kiểm giải thích đoạn chọn"
git add src/app/api/explain-selection/route.ts src/app/api/__tests__/explain-selection.test.ts
git commit -m "feat(api): /api/explain-selection"
git pull --rebase origin main
git push -u origin c/C11-giai-thich-doan-chon
gh pr create --base main --title "C11 — Giải thích đoạn chọn, route explain-selection" --body "Closes #<số Issue>"
```

Báo Vai D chữ ký response để nối popover (D-23). Vai A merge khi CI xanh.

## Tiếp theo

→ Về đích, xem [README](README.md).
