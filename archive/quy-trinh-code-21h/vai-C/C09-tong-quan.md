# C09 — Tổng quan repo, route `analyze-overview`

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 00:00–03:00 (H+12 → H+15) · **Mốc H+16: tổng quan** |
| Nhánh | `c/C09-tong-quan` |
| Cần có trước | C06 |
| Mở đường cho | A12 (A review route lúc 03:00), D10 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b c/C09-tong-quan
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "C09 — Tổng quan repo, route analyze-overview". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Ghi chú: Route /api/analyze-overview vốn là việc của Vai A, được chuyển cho Vai C thực hiện vì Vai A đi ngủ trong khoảng 00:30–03:00; Vai A sẽ review PR này lúc 03:00 khi thức dậy.

## Được đọc
- `.kb/README.md`
- `.kb/spec/20_AI_GOI_VA_PROMPT.md` Mục 5
- `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 4, Test bắt buộc
- `.kb/spec/03_API_VA_LUU_TRU.md` Mục 2 dòng 7, Mục 3.3, Mục 6.6
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 2.2
- `.kb/spec/02_CONTRACTS.md` Mục 1 (CONFIG phần AI), Mục 5.2, Mục 8
- `package.json`
- `src/`

## Được ghi
- `src/server/ai/overview.ts`
- `src/server/ai/prompts/overview.ts`
- `src/server/ai/guard/overview.ts`
- `src/app/api/analyze-overview/route.ts`
- `src/server/ai/__tests__/overview.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1 luồng, prompt, schema, view (.kb/spec/20_AI_GOI_VA_PROMPT.md Mục 5, AI-19): hàm `analyzeOverview` nhận tóm tắt từ các bản phân tích node (không nhận code); prompt OVERVIEW_SYSTEM; OVERVIEW_SCHEMA; hàm tính `facts` do code dựng và ghép phần `ai`.
3. B2 `checkOverview` (.kb/spec/21_AI_KIEM_VA_DUYET.md Mục 4, GUARD-11): kiểm tra kiểu kiến trúc, gạn lọc layers, chỉ giữ nhận xét notes khi mọi node liên quan có weak_points; kiểm tra tên trong repoScope, từ cấm, không có số dòng (O1–O4).
4. B3 route POST `/api/analyze-overview` theo .kb/spec/03_API_VA_LUU_TRU.md Mục 2 dòng 7, Mục 6.6: kiểm tra xác thực, kiểm tra quyền sở hữu phiên, kiểm tra mọi node không analysis_failed đều đã có phân tích (nếu chưa ⇒ trả mã HTTP 409 ERR_OVERVIEW_NOT_READY); tra cứu cache `ai_cache` theo khóa REPO_OVERVIEW (.kb/spec/03_API_VA_LUU_TRU.md Mục 3.3); kiểm tra quota token; ghi dòng `ai_usage` khi gọi AI thành công.
5. Viết test trong `src/server/ai/__tests__/overview.test.ts` cho các trường hợp GUARD-11 dùng fixture 2.2 của .kb/spec/50_TEST_VA_FIXTURE.md.
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/ai`
- Test GUARD-11: fixture 2.2 gạch nhận xét N7 vì không có điểm dở; gạch N3 khỏi MIDDLEWARE; summary chứa số dòng trả về null.
- Route trả đúng HTTP 409 ERR_OVERVIEW_NOT_READY khi còn node đang phân tích dở.
- Yêu cầu trúng cache trả ngay 0 token và không ghi bảng `ai_usage`.

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
Dùng skill giao-task-agy giao task "C09 — Tổng quan repo, route analyze-overview" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/ai` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Test GUARD-11 đạt: cổng gác tổng quan gạch nhận xét không có căn cứ từ fixture 2.2.
- [ ] Route `/api/analyze-overview` kiểm tra trạng thái các node sẵn sàng trước khi gọi AI và xử lý cache đúng chuẩn.

```text
Task "C09 — Tổng quan repo, route analyze-overview" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/ai/overview.ts src/server/ai/prompts/overview.ts
git commit -m "feat(ai): tổng quan repo"
git add src/server/ai/guard/overview.ts src/server/ai/__tests__/overview.test.ts
git commit -m "feat(guard): kiểm tổng quan"
git add src/app/api/analyze-overview/route.ts
git commit -m "feat(api): /api/analyze-overview"
git pull --rebase origin main
git push -u origin c/C09-tong-quan
gh pr create --base main --title "C09 — Tổng quan repo, route analyze-overview" --body "Closes #<số Issue>"
```

Nhắc Vai A review route lúc 03:00 khi thức dậy. Vai A merge khi CI xanh.

## Tiếp theo

→ [C10](C10-duyet-bundle.md)
