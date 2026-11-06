# A11 — Giao agent: các API còn lại

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 00:00–03:00 (H+12 → H+15) |
| Nhánh | `a/A11-api-con-lai` |
| Cần có trước | A10 (evaluate, reveal) |
| Mở đường cho | A12 |
| Cách làm | agy viết file · làm Bước 0–2 trước khi ngủ (00:00–00:30), kiểm Bước 3–4 khi dậy (03:00) |

**Cách nhanh:** nhắn AI `Làm phiếu A11`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b a/A11-api-con-lai
```

Phiếu này giao cho agy chạy tự động trong lúc bạn đi ngủ (00:30–03:00). Bạn chuẩn bị Bước 0–2 trước 00:30, đi ngủ, và quay lại kiểm tra Bước 3–4 lúc 03:00.

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "A11 — Giao agent: các API còn lại". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: A10 (evaluate, reveal). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/03_API_VA_LUU_TRU.md` Mục 2, 6.4, 6.7
- `docs/spec/02_CONTRACTS.md` Mục 6, 8
- `docs/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md` Mục 7, 9
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 3.4
- `docs/spec/00_QUYET_DINH.md` D-22, D-65
- `package.json`
- `src/`

## Được ghi
- `src/server/report.ts`
- `src/server/persona.ts`
- `src/app/api/report-wrong/route.ts`
- `src/app/api/demo/persona/route.ts`
- `src/app/api/sessions/[id]/history/route.ts`
- `src/app/api/__tests__/con-lai.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Viết `src/server/report.ts` và route `src/app/api/report-wrong/route.ts` theo `docs/spec/03_API_VA_LUU_TRU.md` Mục 6.4 (D-22): kiểm tra điều kiện câu đã hoàn thành bị trượt, hoàn trả điểm kỹ năng nếu chưa luyện thêm, che ghi chú theo `maskSensitive(redactSecrets(·).code)` trước khi lưu, ghi bảng `dispute_reports`, tính lại màu node.
3. B2: Viết `src/server/persona.ts` và route `src/app/api/demo/persona/route.ts` theo `docs/spec/03_API_VA_LUU_TRU.md` Mục 6.7 và `docs/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md` Mục 9: kiểm tra cờ `DEMO_MODE` tắt trả `ERR_DEMO_MODE_DISABLED`, ghi đè 16 dòng `skill_states` của tài khoản hiện tại, không gọi ingest.
4. B3: Viết route `src/app/api/sessions/[id]/history/route.ts` trả về `HistoryResponse`.
5. Viết test trong `src/app/api/__tests__/con-lai.test.ts`.
6. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/app/api/__tests__/con-lai.test.ts`
- Test các ca `docs/spec/50_TEST_VA_FIXTURE.md` D18, D24, `ERR_REPORT_NOT_ALLOWED`, `ERR_DEMO_MODE_DISABLED` đều xanh.
- Cờ `DEMO_MODE` tắt trả về HTTP 403 `ERR_DEMO_MODE_DISABLED`.
- Ghi chú `report-wrong` được che dữ liệu nhạy cảm đúng quy định.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không người canh, nên bước nào quá 30 phút thì dừng bước đó, ghi báo cáo, sang bước sau; dừng ở chờ kiểm.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "A11 — Giao agent: các API còn lại" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/app/api/__tests__/con-lai.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Ca test D18 (hoàn điểm BKT khi báo sai) và D24 (che PII trong ghi chú) chạy đạt.
- [ ] Ca test `ERR_REPORT_NOT_ALLOWED` và `ERR_DEMO_MODE_DISABLED` chạy đạt.
- [ ] Lỗi lạ có `error_name`, `error_message` đã che secret.
- [ ] Biến môi trường AI được kiểm lúc khởi động.

```text
Task "A11 — Giao agent: các API còn lại" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/report.ts src/app/api/report-wrong/route.ts
git commit -m "feat(api): /api/report-wrong"
git add src/server/persona.ts src/app/api/demo/persona/route.ts
git commit -m "feat(api): /api/demo/persona"
git add src/app/api/sessions/[id]/history/route.ts src/app/api/__tests__/con-lai.test.ts
git commit -m "feat(api): lịch sử phiên"
git pull --rebase origin main
git push -u origin a/A11-api-con-lai
gh pr create --base main --title "A11 — Giao agent: các API còn lại" --body "Closes #<số Issue>"
```

Dậy lúc 03:00 kiểm tra việc agy đã hoàn thành. Vai A merge khi CI xanh.

## Tiếp theo

→ [A12](A12-ve-dich.md)
