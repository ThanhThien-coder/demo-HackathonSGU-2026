# B09 — Tải chọn lọc repo lớn (D-63)

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 22:00–00:30 (H+10 → H+12.5) |
| Nhánh | `b/B09-tai-chon-loc` |
| Cần có trước | B08 |
| Mở đường cho | DoD dòng `tiangolo/fastapi` |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

**Cách nhanh:** nhắn AI `Làm phiếu B09`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b b/B09-tai-chon-loc
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "B09 — Tải chọn lọc repo lớn (D-63)". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: B08. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/10_ENGINE_INGEST.md` Mục 0, 4, 4A, 5, 6, 8, 9, Test bắt buộc
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 4 (X-08)
- `docs/spec/02_CONTRACTS.md` Mục 1 (`CONFIG`), Mục 3 (`IngestionReport.selective_fetch`), Mục 4
- `docs/spec/00_QUYET_DINH.md` D-63
- `package.json`
- `src/`

## Được ghi
- `src/server/engine/ingest/types.ts`
- `src/server/engine/ingest/selective.ts`
- `src/server/engine/ingest/download.ts`
- `src/server/engine/ingest/index.ts`
- `src/server/engine/ingest/__tests__/chon-loc.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Viết `selective.ts` xử lý tải chọn lọc khi stream zip bị cắt theo `docs/spec/10_ENGINE_INGEST.md` Mục 4A (D-63, ING-46, ING-47, ING-48, ING-49); gửi kèm `GITHUB_TOKEN` nếu có (thiếu token hoặc API lỗi thì lùi về xử lý theo ING-49). Danh sách file trả về dạng `ZipEntryMeta` và đi qua `classifyEntry`, `selectFiles`, `decodeAndFilter` B03 đã viết (không viết lại).
3. B2: Nối vào `runIngest` (`src/server/engine/ingest/index.ts`): `RawArchive.stream_cut = true` và nguồn GitHub ⇒ thay Mục 5, 6, 9 bằng `selective.ts`, đặt `report.selective_fetch = true` khi thành công; lùi (ING-49) ⇒ chạy Mục 5, 6, 9 trên zip đã giữ như cũ. Chỉ sửa `download.ts` nếu cần trả thêm dữ liệu cho bước này.
4. Viết test trong `src/server/engine/ingest/__tests__/chon-loc.test.ts` bao phủ các ca T-ING-10, T-ING-11 và X-08 của `docs/spec/50_TEST_VA_FIXTURE.md`.
5. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.


**Bắt buộc theo bản chạy thử** (chi tiết lỗi ở `docs/quy-trinh-code-21h/loi-can-sua.md`):
- **Manifest (lỗi B-32, ING-48):** tải manifest song song, chỉ lấy manifest trong scope và ở gốc. Bản cũ tải từng file, `vercel/next.js` hết 15 giây chỉ với 37 file nhỏ, chưa tới code.
- Lùi về zip (ING-49) thì xóa warning phạm vi ING-47, không để báo đang phân tích `packages/next/` khi kết quả là toàn repo.
- Dùng `isTestPath` của `priority.ts`, bỏ bản riêng trong `selective.ts`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/server/engine/ingest`
- Có đủ các test T-ING-10, T-ING-11 và X-08, tất cả chạy xanh.
- Khi zip bị cắt và có token, hệ thống lấy được danh sách file từ Git Trees API và tải các file được chọn trong hạn `CONFIG.SELECTIVE_TIMEOUT_MS`.
- Tải chọn lọc chỉ bật khi có biến server `GITHUB_TOKEN`. Thiếu token thì lùi về zip bị cắt kèm cảnh báo (ING-49), đây là hành vi đúng, không phải lỗi. Test mock không chứng minh được đường có token.
- Test có nhiều manifest: tải song song, không chạy tuần tự.
- Test lùi về zip không còn warning ING-47.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Kiểu nội bộ (spec ghi `// nội bộ`) chỉ khai báo ở `src/server/engine/ingest/types.ts` (Tầng 0) hoặc `src/server/engine/graph/types.ts` (Tầng 1–2); file khác `import type` từ đó. Không khai báo lại kiểu đã có ở `@/contracts` hay `types.ts`, không đổi tên hay xóa trường đã có. Cần đổi kiểu phiếu trước đã tạo thì đổi trạng thái `kẹt` và ghi rõ kiểu nào.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "B09 — Tải chọn lọc repo lớn (D-63)" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/server/engine/ingest` cũng xanh (test cũ của B02–B04 vẫn xanh sau khi sửa `runIngest`).
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Có đầy đủ các test T-ING-10, T-ING-11 và X-08.
- [ ] Nếu bị chậm tiến độ, xác nhận có thể cắt giảm phiếu này theo [`07`](../../doc-de-hieu/07_ke_hoach_21h.md) Mục 3 bước 1.
- [ ] Đặt `GITHUB_TOKEN` rồi chạy repo lớn thật như `tiangolo/fastapi`: `selective_fetch = true`, bản đồ dựng từ thư mục chính (DoD spec 50).
- [ ] Có `GITHUB_TOKEN`: `fastapi/fastapi` ra 100 file trong `fastapi/`, `vercel/next.js` có `selective_fetch = true`.
- [ ] Báo Vai A kiểm `GITHUB_TOKEN` trên server deploy.

```text
Task "B09 — Tải chọn lọc repo lớn (D-63)" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/engine/ingest/types.ts src/server/engine/ingest/selective.ts
git commit -m "feat(engine): tải chọn lọc khi zip bị cắt"
git add src/server/engine/ingest/download.ts src/server/engine/ingest/index.ts src/server/engine/ingest/__tests__/chon-loc.test.ts
git commit -m "feat(engine): nối tải chọn lọc"
git pull --rebase origin main
git push -u origin b/B09-tai-chon-loc
gh pr create --base main --title "B09 — Tải chọn lọc repo lớn (D-63)" --body "Closes #<số Issue>"
```

Vai A merge khi CI xanh.

## Tiếp theo

→ [B10](B10-python-mobile.md)
