# B10 — Python đủ, entry main, màn hình React Native

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 00:30–03:00 (H+12.5 → H+15) · **Mốc H+16: Python resolver** |
| Nhánh | `b/B10-python-mobile` |
| Cần có trước | B09 |
| Mở đường cho | Đủ endpoint |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b b/B10-python-mobile
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "B10 — Python đủ, entry main, màn hình React Native". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: B09. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `.kb/spec/11_ENGINE_DO_THI.md` Mục 2, Test bắt buộc
- `.kb/spec/12_ENGINE_MAU_ENTRY.md` Mục 1, 2, Test bắt buộc
- `.kb/spec/02_CONTRACTS.md` Mục 1 (`CONFIG`), Mục 3, 4
- `.kb/spec/00_QUYET_DINH.md` D-57, D-58
- `package.json`
- `queries/`
- `src/`

## Được ghi
- `src/server/engine/graph/resolvers/`
- `src/server/engine/graph/callgraph.ts`
- `queries/`
- `src/server/engine/graph/__tests__/entry.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Hoàn thiện bộ phân giải import cho Python trong `src/server/engine/graph/resolvers/` và truy vấn Tree-sitter trong `queries/` theo `.kb/spec/11_ENGINE_DO_THI.md` Mục 2 (ENG-25).
3. B2: Bổ sung nhận diện entry chương trình `main` (cả khối `if __name__ == "__main__":` trong Python và hàm `main` có thân của các ngôn ngữ) trong `callgraph.ts` theo D-58 và `.kb/spec/12_ENGINE_MAU_ENTRY.md` Mục 2.
4. B3: Bổ sung nhận diện entry màn hình React Native (Stack, Tab, Drawer, Expo Router) trong `callgraph.ts` theo D-57 và `.kb/spec/12_ENGINE_MAU_ENTRY.md` Mục 1.
5. Viết test trong `src/server/engine/graph/__tests__/entry.test.ts` bao phủ các ca T-ENG-39, T-ENG-40, T-ENT-01, T-ENT-02.
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/engine`
- Có đủ các test T-ENG-39, T-ENG-40, T-ENT-01, T-ENT-02 và tất cả chạy xanh.
- Repo Expo Router và repo Python có entry `main` nhận diện chính xác các entry point tương ứng.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Cấm riêng: không làm Flutter / Android / iOS trước khi 3 bước trên xanh ([`07`](../../../doc-de-hieu/07_ke_hoach_21h.md) Mục 3 bước 1).
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "B10 — Python đủ, entry main, màn hình React Native" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/engine` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Có đầy đủ các test T-ENG-39, T-ENG-40, T-ENT-01, T-ENT-02.
- [ ] Repo Python đơn thuần và ứng dụng React Native trích xuất được entry point hợp lệ.

```text
Task "B10 — Python đủ, entry main, màn hình React Native" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/engine/graph/resolvers/ queries/
git commit -m "feat(engine): hoàn thiện resolver Python"
git add src/server/engine/graph/callgraph.ts src/server/engine/graph/__tests__/entry.test.ts
git commit -m "feat(engine): entry chương trình, entry màn hình React Native"
git pull --rebase origin main
git push -u origin b/B10-python-mobile
gh pr create --base main --title "B10 — Python đủ, entry main, màn hình React Native" --body "Closes #<số Issue>"
```

Sau phiếu này bạn đi ngủ lúc 03:00 theo đúng lịch. Vai A merge khi CI xanh.

## Tiếp theo

→ Về đích (xem README vai)
