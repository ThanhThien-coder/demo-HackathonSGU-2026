# A02 — Gõ contracts

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 12:30–13:00 (H+0.5 → H+1) · **Mốc H+1** |
| Nhánh | `a/A02-contracts` |
| Cần có trước | A01 (khung code trên main) |
| Mở đường cho | gần như mọi phiếu |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b a/A02-contracts
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "A02 — Gõ contracts". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/02_CONTRACTS.md` toàn bộ
- `package.json`
- `src/`

## Được ghi
- `src/contracts/`

## Việc cần làm
1. Dùng skill doc-spec đọc `.kb/spec/02_CONTRACTS.md` toàn bộ.
2. Viết `src/contracts/config.ts` từ Mục 1 (bảng `CONFIG`; không gõ Mục 1.1).
3. Viết `src/contracts/base.ts` (Mục 2), `src/contracts/engine.ts` (Mục 3), `src/contracts/engine-internal.ts` (Mục 4).
4. Viết `src/contracts/ai.ts` (Mục 5), `src/contracts/learner.ts` (Mục 6), `src/contracts/storage.ts` (Mục 7).
5. Viết `src/contracts/api.ts` (Mục 8), `src/contracts/errors.ts` (Mục 9), `src/contracts/client.ts` (Mục 10), và `src/contracts/index.ts` re-export toàn bộ kiểu dữ liệu.
6. Đối chiếu mọi tên `export` trong khối code của `.kb/spec/02_CONTRACTS.md` với `src/contracts/`, ghi danh sách tên thiếu vào báo cáo (khi kiem-task, Claude đối chiếu lại một lần nữa).

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit`
- Báo cáo và Claude đều ghi danh sách tên thiếu = rỗng.
- Lệnh `grep -rn "any" src/contracts` không có kết quả `: any`.
- Toàn bộ các định nghĩa kiểu dữ liệu trong `src/contracts/` biên dịch thành công.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không đổi tên, trường, số so với `.kb/spec/02_CONTRACTS.md`; thấy `.kb/spec/02_CONTRACTS.md` sai thì ghi báo cáo.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "A02 — Gõ contracts" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Báo cáo của agy và kiểm tra của Claude đều ghi danh sách tên thiếu = rỗng.
- [ ] Mở terminal gõ `grep -rn "any" src/contracts`, không có bất kỳ `: any` nào.
- [ ] Không đổi tên biến, tên trường hay số so với `.kb/spec/02_CONTRACTS.md`.

```text
Task "A02 — Gõ contracts" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/contracts/config.ts
git commit -m "feat(contracts): CONFIG"
git add src/contracts/base.ts src/contracts/engine.ts src/contracts/engine-internal.ts
git commit -m "feat(contracts): kiểu nền, đầu ra engine, kiểu nội bộ engine"
git add src/contracts/ai.ts src/contracts/learner.ts src/contracts/storage.ts
git commit -m "feat(contracts): kiểu AI, người học, lưu trữ"
git add src/contracts/api.ts src/contracts/errors.ts src/contracts/client.ts src/contracts/index.ts
git commit -m "feat(contracts): API, lỗi, trình duyệt"
git pull --rebase origin main
git push -u origin a/A02-contracts
gh pr create --base main --title "A02 — Gõ contracts" --body "Closes #<số Issue>"
```

Việc của người: Vai B review Mục 3–4, Vai C review Mục 5–6, Vai D review Mục 8–10, mỗi người ≤ 10 phút. Vai A merge trước 13:00 khi CI xanh, nhắn cả nhóm `git pull`.

## Tiếp theo

→ [A03](A03-ci-cd.md)
