# D02 — Store, client API, bảng lỗi

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 13:00–14:30 (H+1 → H+2.5) |
| Nhánh | `d/D02-store-api` |
| Cần có trước | A02 (contracts đã merge) |
| Mở đường cho | D03, D06 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D02-store-api
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D02 — Store, client API, bảng lỗi". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/30_UI.md` Mục 7.1, 10, Test bắt buộc T27
- `.kb/spec/02_CONTRACTS.md` Mục 1, 8, 9, 10
- `package.json`
- `src/`

## Được ghi
- `src/store/workbench.ts`
- `src/lib/api.ts`
- `src/lib/messages.ts`
- `src/lib/__tests__/messages.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết store Zustand trong `src/store/workbench.ts` theo `ClientWorkbenchState` và slice `ui` (`.kb/spec/30_UI.md` Mục 7.1, `.kb/spec/02_CONTRACTS.md` Mục 10).
3. Viết `src/lib/api.ts` có kiểu dữ liệu đầy đủ, gọi các endpoint API, trả response hoặc `ApiError`, không throw lỗi (`.kb/spec/30_UI.md` đầu file).
4. Viết `src/lib/messages.ts` với `ERROR_MESSAGES: Record<ErrorCode, …>` đủ mọi mã lỗi của `.kb/spec/30_UI.md` Mục 10 và `.kb/spec/02_CONTRACTS.md` Mục 9 (kèm `ERR_CLIENT_NETWORK`).
5. Viết test trong `src/lib/__tests__/messages.test.ts` kiểm tra đủ mọi mã lỗi (`.kb/spec/30_UI.md` T27).
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/lib/__tests__/messages.test.ts`
- Bảng `ERROR_MESSAGES` có đầy đủ mọi mã của `ErrorCode`, thiếu một mã sẽ báo lỗi biên dịch.
- Store `workbench.ts` khớp với kiểu `ClientWorkbenchState`.

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
Dùng skill giao-task-agy giao task "D02 — Store, client API, bảng lỗi" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/lib/__tests__/messages.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Test `messages.test.ts` xác nhận đủ toàn bộ các mã lỗi của `ErrorCode`.
- [ ] `src/lib/api.ts` không throw exception mà luôn trả về response hoặc đối tượng `ApiError`.

```text
Task "D02 — Store, client API, bảng lỗi" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/store/workbench.ts
git commit -m "feat(ui): store workbench"
git add src/lib/api.ts
git commit -m "feat(ui): client API có kiểu"
git add src/lib/messages.ts src/lib/__tests__/messages.test.ts
git commit -m "feat(ui): bảng thông điệp lỗi"
git pull --rebase origin main
git push -u origin d/D02-store-api
gh pr create --base main --title "D02 — Store, client API, bảng lỗi" --body "Closes #<số Issue>"
```

Báo Vai A review và merge. Vai A merge khi CI xanh.

## Tiếp theo

→ [D03](D03-ban-do.md)
