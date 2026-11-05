# C10 — Duyệt tay, đóng băng bundle

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 03:00–05:00 (H+15 → H+17) · **Mốc H+17** |
| Nhánh | `c/C10-duyet-bundle` |
| Cần có trước | C09, E08 (kết quả chạy duyệt lần 1 của Vai E) |
| Mở đường cho | E09, D10 |
| Cách làm | Claude viết và chạy `record-bundle.ts`, chạy lại `review-run.ts` · bạn và người thứ 2 duyệt · bạn kiểm và commit |

**Cách nhanh:** nhắn AI `Làm phiếu C10`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

Lúc 03:00 thức dậy, làm tay theo thứ tự, **Claude không làm các việc này**:

1. Tạo nhánh làm việc:

```powershell
git checkout main; git pull; npm ci; git checkout -b c/C10-duyet-bundle
```

2. Bạn cùng người thứ 2 (Vai A hoặc Vai D) đọc bảng `review/ket_qua_duyet.md` do Vai E lập ở E08, **tự tay** đối soát và điền kết quả vào bảng. Xử lý mọi ô ❌ hoặc ❓ theo `docs/spec/21_AI_KIEM_VA_DUYET.md` Mục 10 bước 4–5. Có ❌ thì sửa nguyên nhân trong prompt, nhờ Vai A tăng `CONFIG.PROMPT_VERSION`, rồi chạy lại `scripts/review-run.ts` và duyệt lại.
3. Mọi ô đã thống nhất thì commit bảng duyệt trước (bảng này người điền, AI không ghi):

```powershell
git add review/ket_qua_duyet.md
git commit -m "docs(demo): duyệt tay lần 2"
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "C10 — Duyệt tay, đóng băng bundle". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: C09, E08 (kết quả chạy duyệt lần 1 của Vai E). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/21_AI_KIEM_VA_DUYET.md` Mục 10
- `docs/spec/02_CONTRACTS.md` Mục 1 (CONFIG), Mục 10
- `docs/spec/00_QUYET_DINH.md` D-15, D-51
- `package.json`
- `src/`
- `scripts/`
- `review/`
- `public/`

## Được ghi
- `scripts/record-bundle.ts`
- `public/demo/mock_bundle.json`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết script `scripts/record-bundle.ts` theo GUARD-19 (`docs/spec/21_AI_KIEM_VA_DUYET.md` Mục 10, phần Đóng băng) và `docs/spec/02_CONTRACTS.md` Mục 10: gọi API thật theo kịch bản demo (phân tích, tổng quan, câu hỏi, chấm) trên repo demo, thu thành đối tượng kiểu `OfflineMockBundle`. Tôi sẽ đưa URL server; token nằm trong biến môi trường của cửa sổ lệnh, không in token ra.
3. Chạy script `scripts/record-bundle.ts` ghi gói dữ liệu offline hoàn chỉnh vào `public/demo/mock_bundle.json`.
4. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit`
- File `public/demo/mock_bundle.json` được sinh ra, trường `recorded_from` có đủ `repo`, `snapshot_id`, `engine_version`, `prompt_version`, `model`, `recorded_at`; `model` và `prompt_version` khớp `CONFIG.LLM_MODEL`, `CONFIG.PROMPT_VERSION`.
- `git diff` không có `review/ket_qua_duyet.md` (bảng duyệt do người điền).
- Không bao giờ sửa tay output AI trong cache hay trong bundle (GUARD-19).

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Không bao giờ sửa tay output AI (GUARD-19), không sửa trong ai_cache, không sửa trong bundle.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Không giao agy cho task "C10 — Duyệt tay, đóng băng bundle" vì cần chạy lệnh. Bạn tự làm đúng mục Việc cần làm của task, rồi tự kiểm theo Tiêu chí xong. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push. Báo lại: các lệnh đã chạy và kết quả (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa.
```

Rồi mở **chat Claude mới** và dán:

```text
Dùng skill kiem-task kiểm task "C10 — Duyệt tay, đóng băng bundle": chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push. Chỉ báo lại kết quả.
```

Claude chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, làm tiếp từng nhóm commit ở Bước 4.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Bảng `review/ket_qua_duyet.md` đã được bạn và người thứ 2 tự điền, commit ở Bước 0 trước khi chạy script ghi gói.
- [ ] Gói `public/demo/mock_bundle.json` có `recorded_from` đúng model và `CONFIG.PROMPT_VERSION`.
- [ ] Không có bất kỳ sự can thiệp sửa tay nào vào nội dung output của AI (GUARD-19).

```text
Task "C10 — Duyệt tay, đóng băng bundle" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add scripts/record-bundle.ts
git commit -m "feat(demo): ghi lại gói offline"
git add public/demo/mock_bundle.json
git commit -m "feat(demo): gói offline repo demo"
git pull --rebase origin main
git push -u origin c/C10-duyet-bundle
gh pr create --base main --title "C10 — Duyệt tay, đóng băng bundle" --body "Closes #<số Issue>"
```

Vai A merge khi CI xanh và thông báo đóng băng tính năng lúc 05:00 (A12). Báo Vai E (E09) và Vai D (D10) gói offline đã có trên `main` để thử X-06.

## Tiếp theo

→ Về đích (xem README vai)
