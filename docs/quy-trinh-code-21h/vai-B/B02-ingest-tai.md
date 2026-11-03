# B02 — Ingest 1: link, thăm dò, nhánh, tải, phiên bản

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 13:00–14:30 (H+1 → H+2.5) |
| Nhánh | `b/B02-ingest-tai` |
| Cần có trước | A02 (contracts đã merge) |
| Mở đường cho | B03, A06 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b b/B02-ingest-tai
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "B02 — Ingest 1: link, thăm dò, nhánh, tải, phiên bản". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: A02 (contracts đã merge). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `.kb/spec/10_ENGINE_INGEST.md` Mục 1, 2, 3, 4, 5, Test bắt buộc
- `.kb/spec/02_CONTRACTS.md` Mục 1 (`CONFIG`), Mục 4
- `.kb/spec/00_QUYET_DINH.md` D-38
- `package.json`
- `src/`

## Được ghi
- `src/server/engine/ingest/url.ts`
- `src/server/engine/ingest/probe.ts`
- `src/server/engine/ingest/refs.ts`
- `src/server/engine/ingest/download.ts`
- `src/server/engine/ingest/snapshot.ts`
- `src/server/engine/ingest/__tests__/tai.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Viết `url.ts` chuẩn hóa và phân tích link GitHub theo `.kb/spec/10_ENGINE_INGEST.md` Mục 1 (D-38, ING-10, ING-11, ING-12, ING-13).
3. B2: Viết `probe.ts` và `refs.ts` thăm dò repo và tìm nhánh mặc định theo `.kb/spec/10_ENGINE_INGEST.md` Mục 2, 3 (ING-20, ING-21, ING-22, ING-30, ING-31, ING-32, ING-33, ING-34).
4. B3: Viết `download.ts` tải zip trong RAM có trần byte và timer theo `.kb/spec/10_ENGINE_INGEST.md` Mục 4 (chỉ RAM, ING-01, ING-40, ING-42, ING-43, ING-44, ING-45), viết `snapshot.ts` định danh phiên bản theo Mục 5 (ING-50, ING-52).
5. Viết test trong `src/server/engine/ingest/__tests__/tai.test.ts` bao phủ các ca T-ING-01, T-ING-02, T-ING-03, T-ING-04, T-ING-06, T-ING-07, T-ING-08, T-ING-09, T-ING-33 bằng mock `fetch`.
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/engine/ingest/__tests__/tai.test.ts`
- Có test T-ING-01, T-ING-02, T-ING-03, T-ING-04, T-ING-06, T-ING-07, T-ING-08, T-ING-09, T-ING-33 (mạng giả bằng mock `fetch`).
- Zero-Disk: toàn bộ xử lý tải và buffer zip chỉ thực hiện trong RAM (ING-01).

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
Dùng skill giao-task-agy giao task "B02 — Ingest 1: link, thăm dò, nhánh, tải, phiên bản" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/engine/ingest/__tests__/tai.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Có đầy đủ các test T-ING-01, T-ING-02, T-ING-03, T-ING-04, T-ING-06, T-ING-07, T-ING-08, T-ING-09, T-ING-33.
- [ ] Xác nhận code tải không ghi bất kỳ file tạm nào ra đĩa (ING-01).

```text
Task "B02 — Ingest 1: link, thăm dò, nhánh, tải, phiên bản" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/engine/ingest/url.ts
git commit -m "feat(engine): phân tích link GitHub"
git add src/server/engine/ingest/probe.ts src/server/engine/ingest/refs.ts
git commit -m "feat(engine): thăm dò repo, tìm nhánh mặc định"
git add src/server/engine/ingest/download.ts src/server/engine/ingest/snapshot.ts src/server/engine/ingest/__tests__/tai.test.ts
git commit -m "feat(engine): tải zip trong RAM, định danh phiên bản"
git pull --rebase origin main
git push -u origin b/B02-ingest-tai
gh pr create --base main --title "B02 — Ingest 1: link, thăm dò, nhánh, tải, phiên bản" --body "Closes #<số Issue>"
```

Vai A merge khi CI xanh.

## Tiếp theo

→ [B03](B03-ingest-loc.md)
