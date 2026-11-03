# B09 — Tải chọn lọc repo lớn (D-63)

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 22:00–00:30 (H+10 → H+12.5) |
| Nhánh | `b/B09-tai-chon-loc` |
| Cần có trước | B08 |
| Mở đường cho | DoD dòng `tiangolo/fastapi` |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b b/B09-tai-chon-loc
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "B09 — Tải chọn lọc repo lớn (D-63)". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/10_ENGINE_INGEST.md` Mục 4, 4A, Test bắt buộc
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 4 (X-08)
- `.kb/spec/02_CONTRACTS.md` Mục 1 (`CONFIG`), Mục 4
- `.kb/spec/00_QUYET_DINH.md` D-63
- `package.json`
- `src/`

## Được ghi
- `src/server/engine/ingest/selective.ts`
- `src/server/engine/ingest/download.ts`
- `src/server/engine/ingest/__tests__/chon-loc.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Viết `selective.ts` xử lý tải chọn lọc khi stream zip bị cắt theo `.kb/spec/10_ENGINE_INGEST.md` Mục 4A (D-63, ING-46, ING-47, ING-48, ING-49); gửi kèm `GITHUB_TOKEN` nếu có (thiếu token hoặc API lỗi thì lùi về xử lý theo ING-49).
3. B2: Nối cơ chế tải chọn lọc vào `download.ts` khi cờ `stream_cut = true`.
4. Viết test trong `src/server/engine/ingest/__tests__/chon-loc.test.ts` bao phủ các ca T-ING-10, T-ING-11 và X-08 của `.kb/spec/50_TEST_VA_FIXTURE.md`.
5. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/engine/ingest/__tests__/chon-loc.test.ts`
- Có đủ các test T-ING-10, T-ING-11 và X-08, tất cả chạy xanh.
- Khi zip bị cắt và có token, hệ thống lấy được danh sách file từ Git Trees API và tải các file được chọn trong hạn `CONFIG.SELECTIVE_TIMEOUT_MS`.

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
Dùng skill giao-task-agy giao task "B09 — Tải chọn lọc repo lớn (D-63)" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/engine/ingest/__tests__/chon-loc.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Có đầy đủ các test T-ING-10, T-ING-11 và X-08.
- [ ] Nếu bị chậm tiến độ, xác nhận có thể cắt giảm phiếu này theo [`07`](../../../doc-de-hieu/07_ke_hoach_21h.md) Mục 3 bước 1.

```text
Task "B09 — Tải chọn lọc repo lớn (D-63)" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/engine/ingest/selective.ts
git commit -m "feat(engine): tải chọn lọc khi zip bị cắt"
git add src/server/engine/ingest/download.ts src/server/engine/ingest/__tests__/chon-loc.test.ts
git commit -m "feat(engine): nối tải chọn lọc"
git pull --rebase origin main
git push -u origin b/B09-tai-chon-loc
gh pr create --base main --title "B09 — Tải chọn lọc repo lớn (D-63)" --body "Closes #<số Issue>"
```

Vai A merge khi CI xanh.

## Tiếp theo

→ [B10](B10-python-mobile.md)
