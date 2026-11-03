# B05 — Tầng 1: symbol, đồ thị gọi hàm, entry, chọn chế độ

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 17:30–18:30 (H+5.5 → H+6.5) |
| Nhánh | `b/B05-tang1` |
| Cần có trước | B01, B04 |
| Mở đường cho | B06 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b b/B05-tang1
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "B05 — Tầng 1: symbol, đồ thị gọi hàm, entry, chọn chế độ". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/11_ENGINE_DO_THI.md` Mục 1, 2, 3, 4, 5, Test bắt buộc
- `.kb/spec/12_ENGINE_MAU_ENTRY.md` Mục 1, 2, 3
- `.kb/spec/02_CONTRACTS.md` Mục 1 (`CONFIG`), Mục 3, 4
- `package.json`
- `queries/`
- `src/`

## Được ghi
- `src/server/engine/graph/registry.ts`
- `src/server/engine/graph/symbols.ts`
- `src/server/engine/graph/resolvers/`
- `src/server/engine/graph/callgraph.ts`
- `src/server/engine/graph/degraded.ts`
- `queries/`
- `src/server/engine/graph/__tests__/tang1.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Xây dựng bảng symbol `collectSymbols`, giải quyết import `resolveImports` trong `symbols.ts`, hoàn thiện `registry.ts` và các resolver cho TS/JS và Python trong `src/server/engine/graph/resolvers/` kèm truy vấn Tree-sitter trong `queries/` theo `.kb/spec/11_ENGINE_DO_THI.md` Mục 1, 2 (ENG-20, ENG-21, ENG-22, ENG-23, ENG-24, ENG-25).
3. B2: Xây dựng đồ thị gọi hàm `buildCallGraph` trong `callgraph.ts` theo Mục 3 (ENG-30, ENG-31, ENG-32, ENG-33, ENG-34, ENG-35), nhận diện entry point theo mẫu của `.kb/spec/12_ENGINE_MAU_ENTRY.md` Mục 1–3 (ưu tiên TS/JS và Python trước) và Mục 4 (ENG-40), hiện thực phần chọn chế độ trong `degraded.ts` theo Mục 5 (ENG-51).
4. Viết test trong `src/server/engine/graph/__tests__/tang1.test.ts` bao phủ các ca T-ENG-08, T-ENG-09, T-ENG-12, T-ENG-25, T-ENG-31.
5. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/engine/graph/__tests__/tang1.test.ts`
- Có đủ các test T-ENG-08, T-ENG-09, T-ENG-12, T-ENG-25, T-ENG-31 và tất cả chạy xanh.
- Đồ thị gọi hàm và danh sách entry nhận diện chính xác các route handler của Express và NestJS.

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
Dùng skill giao-task-agy giao task "B05 — Tầng 1: symbol, đồ thị gọi hàm, entry, chọn chế độ" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/engine/graph/__tests__/tang1.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Có đầy đủ các test T-ENG-08, T-ENG-09, T-ENG-12, T-ENG-25, T-ENG-31.
- [ ] Đồ thị gọi hàm giải quyết chính xác các cuộc gọi qua interface và import tương đối trong TS/JS.

```text
Task "B05 — Tầng 1: symbol, đồ thị gọi hàm, entry, chọn chế độ" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/engine/graph/registry.ts src/server/engine/graph/symbols.ts src/server/engine/graph/resolvers/ queries/
git commit -m "feat(engine): bảng symbol, resolver TS/JS, Python"
git add src/server/engine/graph/callgraph.ts src/server/engine/graph/degraded.ts src/server/engine/graph/__tests__/tang1.test.ts
git commit -m "feat(engine): đồ thị gọi hàm, entry, chế độ"
git pull --rebase origin main
git push -u origin b/B05-tang1
gh pr create --base main --title "B05 — Tầng 1: symbol, đồ thị gọi hàm, entry, chọn chế độ" --body "Closes #<số Issue>"
```

Vai A merge khi CI xanh.

## Tiếp theo

→ [B06](B06-lat-cat.md)
