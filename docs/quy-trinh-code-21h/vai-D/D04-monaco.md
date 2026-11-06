# D04 — Khung xem code bằng Monaco

Làm xong phiếu này, cột giữa cho người học đọc các lát cắt mã nguồn với Monaco tự host, số dòng gốc chuẩn xác, đổi màu theo chủ đề và đồng bộ bước với bài học.

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 16:00–17:30 (H+4 → H+5.5) |
| Nhánh | `d/D04-monaco` |
| Cần có trước | D03 |
| Mở đường cho | D05 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

**Cách nhanh:** nhắn AI `Làm phiếu D04`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D04-monaco
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D04 — Khung xem code bằng Monaco". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: D03. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/30_UI.md` Mục 5, 11
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 6: T9, T22
- `docs/spec/02_CONTRACTS.md` Mục 3, 10
- `package.json`
- `src/`

## Được ghi
- `src/components/code/MonacoPane.tsx`
- `src/components/code/slice-model.ts`
- `src/components/code/__tests__/slice-model.test.ts`
- `src/components/learn/CodeSnippetViewer.tsx`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết `buildSliceModel(node)` trong `src/components/code/slice-model.ts` chuyển đổi các bước lát cắt và snippet thành model hoàn chỉnh kèm `lineMap` ánh xạ số dòng gốc và `stepRanges` từng bước (`docs/spec/30_UI.md` Mục 5).
3. Viết `src/components/code/MonacoPane.tsx` chỉ đọc, cấu hình Monaco tự host qua `loader.config({ monaco })` với gói `monaco-editor` không dùng CDN, tải chậm qua `next/dynamic` (`ssr: false`), theme `simplifey-dark` / `simplifey-light` theo chủ đề (`docs/spec/30_UI.md` Mục 5).
4. Viết cột giữa `src/components/learn/CodeSnippetViewer.tsx` chứa `MonacoPane`: đầu khung có hàng chip bước (số, tầng, tên file, ⚠) và dòng đường dẫn, hàm, "dòng x–y · Bước k/n"; cuối khung có chú giải 3 màu tô sáng; chưa chọn node thì hiện lời nhắc theo `docs/spec/30_UI.md` Mục 5. X-Ray không nằm ở đây.
5. Hiện thực tô sáng bước chọn, vạch đỏ cho điểm dở, vạch tím cho gợi ý `CODE_POINTER`, và đồng bộ 2 chiều giữa editor và phần học qua `active_step` theo UI-32, UI-33 (`docs/spec/30_UI.md` Mục 5).
6. Viết test `src/components/code/__tests__/slice-model.test.ts` với tên test bắt đầu bằng `UI-31` (số dòng gốc).
7. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/components/code/__tests__/slice-model.test.ts`
- Test tên bắt đầu bằng `UI-31` kiểm tra số dòng gốc: đầu snippet bước 2 có số dòng gốc chuẩn, tiêu đề và marker không có số dòng.
- Monaco editor tự host hoàn toàn không tải qua CDN ngoài mạng.
- Đồng bộ 2 chiều qua `active_step` giữa `MonacoPane` và tab X-Ray.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/server/`, `src/app/api/`, `src/app/auth/`, `src/contracts/*`.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không commit file làm việc của agent (`.agents/`, prompt nháp) và ảnh không dùng.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D04 — Khung xem code bằng Monaco" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/components/code/__tests__/slice-model.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Test `slice-model.test.ts` xác nhận số dòng gốc hiển thị đúng theo `UI-31` (tiêu đề và marker dòng 0 không hiển thị số).
- [ ] Người chạy tay: ngắt kết nối mạng, mở trang web vẫn nạp được Monaco editor bình thường mà không báo lỗi tải gói qua CDN.
- [ ] Bấm ☀/☾ thì Monaco đổi màu theo chủ đề (T38).

```text
Task "D04 — Khung xem code bằng Monaco" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/components/code/slice-model.ts src/components/code/__tests__/slice-model.test.ts
git commit -m "feat(ui): dựng model lát cắt và test số dòng gốc"
git add src/components/code/MonacoPane.tsx
git commit -m "feat(ui): Monaco tự host, tô sáng và đồng bộ bước"
git add src/components/learn/CodeSnippetViewer.tsx
git commit -m "feat(ui): cột code có chip bước"
git pull --rebase origin main
git push -u origin d/D04-monaco
gh pr create --base main --title "D04 — Khung xem code bằng Monaco" --body "Closes #<số Issue>"
```

Báo Vai A review và merge. Vai A merge khi CI xanh.

## Tiếp theo

→ [D05](D05-phan-tich.md)
