# B03 — Ingest 2: mục lục zip, phân loại, phạm vi, giải nén

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 14:30–16:00 (H+2.5 → H+4) · **Mốc H+4: tải và lọc repo demo trong RAM** |
| Nhánh | `b/B03-ingest-loc` |
| Cần có trước | B02 |
| Mở đường cho | B04 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b b/B03-ingest-loc
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "B03 — Ingest 2: mục lục zip, phân loại, phạm vi, giải nén". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: B02. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `.kb/spec/10_ENGINE_INGEST.md` Mục 6, 7, 8, 9, Test bắt buộc
- `.kb/spec/02_CONTRACTS.md` Mục 1 (`CONFIG`), Mục 4
- `package.json`
- `src/`

## Được ghi
- `src/server/engine/ingest/unzip.ts`
- `src/server/engine/ingest/prune.ts`
- `src/server/engine/ingest/priority.ts`
- `src/server/engine/ingest/fingerprint.ts`
- `src/server/engine/ingest/__tests__/loc.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Viết `unzip.ts` đọc mục lục zip Central-Directory-First hoặc streaming và chuẩn hóa đường dẫn theo `.kb/spec/10_ENGINE_INGEST.md` Mục 6 (ING-60, ING-61, ING-63).
3. B2: Viết `prune.ts` phân loại entry theo Mục 7 (ING-70, ING-71, ING-72, ING-73, ING-74, ING-75, ING-76, ING-77), viết `priority.ts` tính điểm ưu tiên file FPS và xếp ứng viên theo Mục 8 (ING-84, ING-87, ING-88), viết phần `detectScope` trong `fingerprint.ts` xác định monorepo scope theo Mục 8 (ING-80).
4. B3: Hoàn thiện giải nén có giới hạn, chống zip bomb và lọc nội dung trong `unzip.ts` theo Mục 9.
5. Viết test trong `src/server/engine/ingest/__tests__/loc.test.ts` bao phủ các ca T-ING-12, T-ING-13, T-ING-14, T-ING-15, T-ING-16, T-ING-17, T-ING-18, T-ING-19, T-ING-20, T-ING-21.
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/engine/ingest/__tests__/loc.test.ts`
- Có đủ các test T-ING-12, T-ING-13, T-ING-14, T-ING-15, T-ING-16, T-ING-17, T-ING-18, T-ING-19, T-ING-20, T-ING-21 và tất cả chạy xanh.
- Giải nén tuân thủ đúng trần `CONFIG.MAX_INFLATED_BYTES` và `CONFIG.MAX_CLEAN_FILES`.

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
Dùng skill giao-task-agy giao task "B03 — Ingest 2: mục lục zip, phân loại, phạm vi, giải nén" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/engine/ingest/__tests__/loc.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Có đầy đủ 10 test từ T-ING-12 đến T-ING-21: T-ING-12, T-ING-13, T-ING-14, T-ING-15, T-ING-16, T-ING-17, T-ING-18, T-ING-19, T-ING-20, T-ING-21.
- [ ] Bạn tự chạy tay một script nhỏ tải repo demo trong RAM và in ra số file giữ lại phù hợp.

```text
Task "B03 — Ingest 2: mục lục zip, phân loại, phạm vi, giải nén" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/engine/ingest/prune.ts src/server/engine/ingest/priority.ts src/server/engine/ingest/fingerprint.ts
git commit -m "feat(engine): phân loại entry, chọn phạm vi"
git add src/server/engine/ingest/unzip.ts src/server/engine/ingest/__tests__/loc.test.ts
git commit -m "feat(engine): mục lục zip, chuẩn hóa đường dẫn, giải nén và lọc nội dung"
git pull --rebase origin main
git push -u origin b/B03-ingest-loc
gh pr create --base main --title "B03 — Ingest 2: mục lục zip, phân loại, phạm vi, giải nén" --body "Closes #<số Issue>"
```

Vai A merge khi CI xanh.

## Tiếp theo

→ [B04](B04-ingest-van-tay.md)
