# D04 — Cột 2 Code (Monaco)

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 16:00–17:30 (H+4 → H+5.5) |
| Nhánh | `d/D04-monaco` |
| Cần có trước | D03 |
| Mở đường cho | D05 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D04-monaco
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D04 — Cột 2 Code (Monaco)". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: D03. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `.kb/spec/30_UI.md` Mục 5, 11, Test bắt buộc T9, T22
- `.kb/spec/02_CONTRACTS.md` Mục 3, 10
- `package.json`
- `src/`

## Được ghi
- `src/components/code/CodePane.tsx`
- `src/components/code/slice-model.ts`
- `src/components/code/__tests__/slice-model.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết `buildSliceModel(node)` trong `src/components/code/slice-model.ts` chuyển đổi các bước lát cắt và snippet thành model hoàn chỉnh kèm `lineMap` ánh xạ số dòng gốc và `stepRanges` từng bước (`.kb/spec/30_UI.md` Mục 5).
3. Viết `src/components/code/CodePane.tsx` chỉ đọc, cấu hình Monaco tự host qua `loader.config({ monaco })` với gói `monaco-editor` không dùng CDN, tải chậm qua `next/dynamic` (`ssr: false`) (`.kb/spec/30_UI.md` Mục 5).
4. Hiện thực tô sáng bước chọn, vạch đỏ cho điểm dở, vạch tím cho gợi ý `CODE_POINTER`, và đồng bộ 2 chiều giữa editor và buồng lái theo UI-32, UI-33 (`.kb/spec/30_UI.md` Mục 5).
5. Viết test `src/components/code/__tests__/slice-model.test.ts` với tên test bắt đầu bằng `UI-31` (số dòng gốc).
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/components/code/__tests__/slice-model.test.ts`
- Test tên bắt đầu bằng `UI-31` kiểm tra số dòng gốc: đầu snippet bước 2 có số 14, tiêu đề và marker không có số dòng.

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
Dùng skill giao-task-agy giao task "D04 — Cột 2 Code (Monaco)" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/components/code/__tests__/slice-model.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Test `slice-model.test.ts` xác nhận số dòng gốc hiển thị đúng theo `UI-31` (tiêu đề và marker dòng 0 không hiển thị số).
- [ ] Người chạy tay: ngắt kết nối mạng, mở trang web vẫn nạp được Monaco editor bình thường mà không báo lỗi tải gói qua CDN.

```text
Task "D04 — Cột 2 Code (Monaco)" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/components/code/slice-model.ts src/components/code/__tests__/slice-model.test.ts
git commit -m "feat(ui): dựng model lát cắt"
git add src/components/code/CodePane.tsx
git commit -m "feat(ui): Monaco tự host, tô sáng và đồng bộ bước"
git pull --rebase origin main
git push -u origin d/D04-monaco
gh pr create --base main --title "D04 — Cột 2 Code (Monaco)" --body "Closes #<số Issue>"
```

Báo Vai A review và merge. Vai A merge khi CI xanh.

## Tiếp theo

→ [D05](D05-tab1.md)
