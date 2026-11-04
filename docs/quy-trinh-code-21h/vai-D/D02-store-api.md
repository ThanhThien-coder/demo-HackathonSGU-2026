# D02 — Store, client API, phiên đăng nhập, bảng lỗi

Làm xong phiếu này, ứng dụng có kho quản lý trạng thái máy khách (Zustand store), thư viện gọi API an toàn có kiểu dữ liệu, bộ quản lý phiên đăng nhập và bảng tra thông điệp lỗi đầy đủ.

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
Dùng skill tao-task để tạo task tên "D02 — Store, client API, phiên đăng nhập, bảng lỗi". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: A02 (contracts đã merge). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/30_UI.md` Mục 7.1, 10, Test bắt buộc T27
- `docs/spec/02_CONTRACTS.md` Mục 1, 8, 9, 10
- `package.json`
- `src/`

## Được ghi
- `src/store/workbench.ts`
- `src/lib/api.ts`
- `src/lib/messages.ts`
- `src/lib/supabase/client.ts`
- `src/stores/userStore.ts`
- `src/stores/index.ts`
- `src/lib/__tests__/messages.test.ts`
- `src/lib/__tests__/api.test.ts`
- `src/lib/supabase/__tests__/client.test.ts`
- `src/stores/__tests__/userStore.test.ts`
- `src/store/__tests__/workbench.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết store Zustand trong `src/store/workbench.ts` khớp hoàn toàn kiểu `ClientWorkbenchState` (`docs/spec/30_UI.md` Mục 7.1, `docs/spec/02_CONTRACTS.md` Mục 10). Tuân thủ nguyên tắc store chỉ là bản sao chỉ đọc (D-02): không tự tính toán BKT hay trạng thái node.
3. Viết client khởi tạo Supabase trình duyệt trong `src/lib/supabase/client.ts`, tạo store quản lý phiên người dùng `src/stores/userStore.ts` và export qua `src/stores/index.ts`. Không có token, cờ hay đường tắt bỏ qua đăng nhập.
4. Viết `src/lib/api.ts` có kiểu dữ liệu đầy đủ gọi các endpoint API học tập; cung cấp các hàm bản `Safe` trả kết quả hoặc `ApiError`, không bao giờ throw lỗi (`docs/spec/30_UI.md`). Khi API lỗi thì trả đúng mã lỗi, không thay bằng dữ liệu giả.
5. Viết `src/lib/messages.ts` định nghĩa `ERROR_MESSAGES: Record<ErrorCode, string>` đầy đủ mọi mã lỗi theo `docs/spec/30_UI.md` Mục 10 và `docs/spec/02_CONTRACTS.md` Mục 9 (kèm `ERR_CLIENT_NETWORK`).
6. Viết test trong `src/lib/__tests__/messages.test.ts` kiểm tra đủ mọi mã lỗi (`docs/spec/30_UI.md` T27), và các test tương ứng cho `userStore` và `workbench`.
7. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/lib/__tests__/messages.test.ts`
- Bảng `ERROR_MESSAGES` có đầy đủ mọi mã của `ErrorCode`, thiếu một mã sẽ báo lỗi biên dịch (T27).
- Store `workbench.ts` khớp với kiểu `ClientWorkbenchState`.
- Các hàm API Safe trả về đối tượng lỗi `ApiError` chứ không throw exception.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/server/`, `src/app/api/`, `src/app/auth/`, `src/contracts/*`. Thiếu kiểu hoặc API thì đổi trạng thái `kẹt` và báo vai sở hữu. `package.json` không sửa ở phiếu này.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không commit file làm việc của agent (`.agents/`, prompt nháp) và ảnh không dùng.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D02 — Store, client API, phiên đăng nhập, bảng lỗi" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/lib/__tests__/messages.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Test `messages.test.ts` xác nhận đủ toàn bộ các mã lỗi của `ErrorCode`.
- [ ] `src/lib/api.ts` không throw exception mà luôn trả về response hoặc đối tượng `ApiError`.
- [ ] Store `workbench.ts` quản lý state tập trung, không tự tính toán BKT hay trạng thái node.

```text
Task "D02 — Store, client API, phiên đăng nhập, bảng lỗi" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/store/workbench.ts src/store/__tests__/workbench.test.ts
git commit -m "feat(ui): store workbench khớp client state"
git add src/lib/supabase/client.ts src/stores/
git commit -m "feat(ui): quản lý phiên người dùng qua supabase"
git add src/lib/api.ts
git commit -m "feat(ui): client api an toàn có kiểu"
git add src/lib/messages.ts src/lib/__tests__/messages.test.ts
git commit -m "feat(ui): bảng thông điệp lỗi đầy đủ"
git pull --rebase origin main
git push -u origin d/D02-store-api
gh pr create --base main --title "D02 — Store, client API, phiên đăng nhập, bảng lỗi" --body "Closes #<số Issue>"
```

Báo Vai A review và merge. Vai A merge khi CI xanh.

## Tiếp theo

→ [D03](D03-ban-do.md)
