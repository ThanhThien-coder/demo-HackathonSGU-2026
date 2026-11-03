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
- `docs/spec/10_ENGINE_INGEST.md` Mục 0, 1, 2, 3, 4, 5, Test bắt buộc
- `docs/spec/02_CONTRACTS.md` Mục 1 (`CONFIG`), Mục 3 (`IngestionErrorCode`, `IngestionReport`), Mục 4
- `docs/spec/00_QUYET_DINH.md` D-38
- `package.json`
- `src/`

## Được ghi
- `src/server/engine/ingest/types.ts`
- `src/server/engine/ingest/url.ts`
- `src/server/engine/ingest/probe.ts`
- `src/server/engine/ingest/refs.ts`
- `src/server/engine/ingest/download.ts`
- `src/server/engine/ingest/snapshot.ts`
- `src/server/engine/ingest/__tests__/tai.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B0: Tạo `src/server/engine/ingest/types.ts` chứa kiểu nội bộ Tầng 0 mà phiếu này sinh ra: `ResolvedRef` (Mục 3), `RawArchive` (Mục 4), và lớp `IngestionError extends Error` có thuộc tính `code: IngestionErrorCode` (`docs/spec/02_CONTRACTS.md` Mục 3). Mọi lỗi Tầng 0 ném `IngestionError` với đúng mã trong spec, không ném `Error` thường. Kiểu đã có trong `@/contracts` thì `import type`, không khai báo lại.
3. B1: Viết `url.ts` chuẩn hóa và phân tích link GitHub theo `docs/spec/10_ENGINE_INGEST.md` Mục 1 (D-38, ING-10, ING-11, ING-12, ING-13).
4. B2: Viết `probe.ts` và `refs.ts` thăm dò repo và tìm nhánh mặc định theo `docs/spec/10_ENGINE_INGEST.md` Mục 2, 3 (ING-20, ING-21, ING-22, ING-30, ING-31, ING-32, ING-33, ING-34). `ref_label` lấy đúng theo ING-32 (GitHub chuyển hướng `archive/HEAD.zip` tới SHA nên `ref_label` sẽ là SHA; không tự đổi). ING-34 chỉ chuẩn hóa chuỗi `subdir_override`; lỗi `ERR_NO_SOURCE_FILES_FOUND` báo ở B03 (`detectScope`).
5. B3: Viết `download.ts` tải zip trong RAM có trần byte và timer theo `docs/spec/10_ENGINE_INGEST.md` Mục 4 (chỉ RAM, ING-01, ING-40, ING-42, ING-43, ING-44, ING-45), viết `snapshot.ts` định danh phiên bản theo Mục 5 (ING-50, ING-52). Hai điểm hay sai:
   - `computeSnapshot`: `ref` khớp 40 hex ⇒ `COMMIT_SHA` = `ref` **kể cả khi `stream_cut`**; `stream_cut` chỉ bỏ bước đọc EOCD (Mục 5 ý 2).
   - `receiveUpload` chỉ nhận `multipart/form-data` có trường `archive`; body khác ⇒ `ERR_UPLOAD_INVALID` (ING-45). Không nhận luồng nhị phân trần.
   - `downloadArchive` chỉ hẹn giờ và thử lại phần tải. Vòng thử lại phủ cả giải nén (ING-40, ING-44 khi zip hỏng ING-63) để B04 làm trong `runIngest`.
6. Viết test trong `src/server/engine/ingest/__tests__/tai.test.ts` bao phủ các ca T-ING-01, T-ING-02, T-ING-03, T-ING-04, T-ING-06, T-ING-07, T-ING-08, T-ING-09, T-ING-33 bằng mock `fetch`, thêm ca `stream_cut` + ref 40 hex. Tên test đầy đủ (gồm cả `describe` bọc ngoài) bắt đầu bằng mã T-ING hoặc ING, không bắt đầu bằng tên task. Trong test, `new File([...])` nhận `Uint8Array` thì bọc `new Uint8Array(x)` để `tsc` không báo lỗi `BlobPart`.
7. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/server/engine/ingest/__tests__/tai.test.ts`
- Có test T-ING-01, T-ING-02, T-ING-03, T-ING-04, T-ING-06, T-ING-07, T-ING-08, T-ING-09, T-ING-33 (mạng giả bằng mock `fetch`).
- Zero-Disk: toàn bộ xử lý tải và buffer zip chỉ thực hiện trong RAM (ING-01).

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
Dùng skill giao-task-agy giao task "B02 — Ingest 1: link, thăm dò, nhánh, tải, phiên bản" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/server/engine/ingest/__tests__/tai.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Có đầy đủ các test T-ING-01, T-ING-02, T-ING-03, T-ING-04, T-ING-06, T-ING-07, T-ING-08, T-ING-09, T-ING-33.
- [ ] Xác nhận code tải không ghi bất kỳ file tạm nào ra đĩa (ING-01).

```text
Task "B02 — Ingest 1: link, thăm dò, nhánh, tải, phiên bản" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/engine/ingest/types.ts src/server/engine/ingest/url.ts
git commit -m "feat(engine): kiểu nội bộ Tầng 0, phân tích link GitHub"
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
