# C09 — Tổng quan repo, route `analyze-overview`

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 00:00–03:00 (H+12 → H+15) · **Mốc H+16: tổng quan** |
| Nhánh | `c/C09-tong-quan` |
| Cần có trước | C06, A05 (phiên, cache, quota), A07 (route `analyze-node` làm mẫu). Không bắt buộc: nhóm `groups` (B-40), `readme_excerpt` (B-41); chưa có thì gói ngữ cảnh thiếu phần đó |
| Mở đường cho | A12 (A review route lúc 03:00), D10 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

**Cách nhanh:** nhắn AI `Làm phiếu C09`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b c/C09-tong-quan
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "C09 — Tổng quan repo, route analyze-overview". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: C06, A05 (phiên, cache, quota), A07 (route `analyze-node` làm mẫu). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

Ghi chú: Route /api/analyze-overview vốn là việc của Vai A, được chuyển cho Vai C thực hiện vì Vai A đi ngủ trong khoảng 00:30–03:00; Vai A sẽ review PR này lúc 03:00 khi thức dậy.

## Được đọc
- `.kb/README.md`
- `docs/spec/20_AI_GOI_VA_PROMPT.md` Mục 5
- `docs/spec/21_AI_KIEM_VA_DUYET.md` Mục 4, Test bắt buộc
- `docs/spec/03_API_VA_LUU_TRU.md` Mục 2 dòng 7, Mục 3.3, Mục 6.6
- `docs/spec/00_QUYET_DINH.md` D-83, D-84
- `src/server/engine/__fixtures__/shop-api.json`
- `docs/spec/02_CONTRACTS.md` Mục 1 (CONFIG phần AI), Mục 5.2, Mục 8
- `package.json`
- `src/`

## Được ghi
- `src/server/ai/overview.ts`
- `src/server/ai/prompts/overview.ts`
- `src/server/ai/guard/overview.ts`
- `src/app/api/analyze-overview/route.ts`
- `src/server/ai/__tests__/overview.test.ts`
- `src/app/api/__tests__/analyze-overview.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1 luồng, prompt, schema, view (docs/spec/20_AI_GOI_VA_PROMPT.md Mục 5, AI-19): hàm `analyzeOverview(session, graph)` dựng gói ngữ cảnh `<repo_summary>` (không có code, không chờ bản phân tích node, D-83); prompt OVERVIEW_SYSTEM; OVERVIEW_SCHEMA = `RepoOverviewRaw` (`summary`, `groups`, `node_titles`); hàm tính `facts` do code dựng và ghép phần `ai`.
3. B2 `checkOverview` (docs/spec/21_AI_KIEM_VA_DUYET.md Mục 4, GUARD-11): chỉ giữ `group_id`, `node_id` có thật; thiếu hoặc trùng tên ⇒ O5; tên quá dài hoặc quá ngắn ⇒ O6; cắt `summary` còn 2 câu; kiểm tên trong repoScope, từ cấm, không có số dòng (O1–O4).
4. B3 route POST `/api/analyze-overview` theo docs/spec/03_API_VA_LUU_TRU.md Mục 2 dòng 7, Mục 6.6: kiểm tra xác thực, kiểm tra quyền sở hữu phiên, KHÔNG chờ node phân tích xong (D-83, không còn `ERR_OVERVIEW_NOT_READY`); tra cứu cache `ai_cache` theo khóa REPO_OVERVIEW (docs/spec/03_API_VA_LUU_TRU.md Mục 3.3); kiểm tra quota token; ghi dòng `ai_usage` khi gọi AI thành công. Dùng lại hàm có sẵn của Vai A trong `src/server/auth.ts`, `session.ts`, `cache.ts`, `quota.ts`, `errors.ts`, không viết lại; làm theo mẫu `src/app/api/analyze-node/route.ts` (A07).
5. Viết test trong `src/server/ai/__tests__/overview.test.ts` cho các ca GUARD-11 (`21`) và AI-19 (`20`) trên `shop-api`. Viết test route trong `src/app/api/__tests__/analyze-overview.test.ts` (mock AI và DB) cho ca gọi khi chưa có bản phân tích nào và ca trúng cache.
6. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.


**Bắt buộc theo bản chạy thử** (chi tiết lỗi ở `docs/quy-trinh-code-21h/loi-can-sua.md`):
- **Gọi đầu phiên (D-83, lỗi C-12):** client gọi tổng quan ngay khi có bản đồ, trước khi tải trước node (D-46). Tên AI chỉ để hiện, `node.id` và `title` của engine không đổi (D-08).
- **Gọi lại theo `retryDelay` (lỗi C-05, D-74 R1):** dùng chung `retryDelay` của `gemini.ts`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/ai src/app/api/__tests__/analyze-overview.test.ts`
- Test GUARD-11 theo `21` Test bắt buộc: thiếu tên 1 bài ⇒ O5, `null`; trùng tên ⇒ O5; `group_id` lạ bị bỏ; `summary` 3 câu còn 2; tên có "dòng 5" ⇒ O4.
- Route gọi được khi chưa có bản phân tích node nào.
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

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/ai src/app/api/__tests__/analyze-overview.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Test GUARD-11 và AI-19 đạt.
- [ ] Route `/api/analyze-overview` không chờ node, xử lý cache đúng chuẩn.
- [ ] Chạy AI thật ngay sau khi quét `shop-api` và BrewLite: có bức tranh chung 2 câu, tên nhóm, tên bài trước khi phân tích bài nào; mỗi bài đúng 1 tên, không trùng (lỗi C-12).
- [ ] Tắt AI (`AI_DISABLED="true"`): Tổng quan vẫn có nhóm, tên engine, câu dự phòng (D-83).

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
git add src/app/api/analyze-overview/route.ts src/app/api/__tests__/analyze-overview.test.ts
git commit -m "feat(api): /api/analyze-overview"
git pull --rebase origin main
git push -u origin c/C09-tong-quan
gh pr create --base main --title "C09 — Tổng quan repo, route analyze-overview" --body "Closes #<số Issue>"
```

Nhắc Vai A review route lúc 03:00 khi thức dậy. Vai A merge khi CI xanh.

## Tiếp theo

→ [C10](C10-duyet-bundle.md)
