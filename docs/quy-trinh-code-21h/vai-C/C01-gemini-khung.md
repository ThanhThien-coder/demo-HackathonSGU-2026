# C01 — Đo Gemini, khung `gemini.ts`

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 12:00–13:00 (H+0 → H+1) · **Mốc H+1** |
| Nhánh | `c/C01-gemini-khung` |
| Cần có trước | Bước 1 cần A01 |
| Mở đường cho | C04 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

Trước khi tạo task và gọi agy, bạn tự làm các việc sau:
1. Gửi một prompt thật (prompt phân tích `.kb/spec/20_AI_GOI_VA_PROMPT.md` Mục 4 với code N3 ở `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 1.2) bằng Google AI Studio hoặc Vertex AI, 3 lần, ghi độ trễ thật. Nếu cần chỉnh `CONFIG.LLM_TIMEOUT_MS` thì báo Vai A (D-50).
2. Xem xét và review PR contracts Mục 5–6 của Vai A.
3. Chạy lệnh:

```powershell
git checkout main; git pull; npm ci; git checkout -b c/C01-gemini-khung
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "C01 — Đo Gemini, khung gemini.ts". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: Bước 1 cần A01. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `.kb/spec/03_API_VA_LUU_TRU.md` Mục 8
- `.kb/spec/05_HA_TANG_CLOUD.md` Mục 6
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 4 X-11, X-12
- `.kb/spec/00_QUYET_DINH.md` D-50, D-66
- `.kb/spec/02_CONTRACTS.md` Mục 9 (mã lỗi)
- `package.json`
- `src/`

## Được ghi
- `src/server/ai/gemini.ts`
- `src/server/ai/__tests__/gemini.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1 khung `gemini.ts`: khởi tạo SDK `@google/genai`, chọn kênh theo biến môi trường `GEMINI_BACKEND` (`"vertex"` hoặc `"studio"`) theo `.kb/spec/05_HA_TANG_CLOUD.md` Mục 6 và D-66.
3. Kiểm tra điều kiện khởi động: viết thành một hàm kiểm biến môi trường được export riêng, để test gọi thẳng. `GEMINI_BACKEND="studio"` mà thiếu `GEMINI_API_KEY` thì hàm ném lỗi (server không được khởi động); `GEMINI_BACKEND="vertex"` thì xác thực qua service account, không đòi `GEMINI_API_KEY`. Không tự tạo file khởi động server; ghi trong báo cáo tên hàm để Vai A gắn vào lúc khởi động.
4. Cơ chế ngắt AI khẩn cấp: nếu `AI_DISABLED="true"` thì trả ngay mã lỗi `ERR_AI_UNAVAILABLE` mà không gọi tới Gemini (.kb/spec/03_API_VA_LUU_TRU.md Mục 8, .kb/spec/05_HA_TANG_CLOUD.md Mục 6, D-66). Mã lỗi: nếu `src/contracts/` (A02) đã có trên nhánh thì lấy kiểu mã lỗi từ `@/contracts`; nếu chưa có thì tạm dùng chuỗi `"ERR_AI_UNAVAILABLE"` đúng chính tả ở `.kb/spec/02_CONTRACTS.md` Mục 9, và ghi trong báo cáo là C04 sẽ đổi sang kiểu từ `@/contracts`.
5. Viết test trong `src/server/ai/__tests__/gemini.test.ts` cho các trường hợp X-11 và X-12. Test mock SDK, không gọi Gemini thật.
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/ai/__tests__/gemini.test.ts`
- Test X-11: `AI_DISABLED="true"` trả `ERR_AI_UNAVAILABLE`, không gọi model.
- Test X-12: `GEMINI_BACKEND="studio"` thiếu `GEMINI_API_KEY` thì hàm kiểm biến môi trường ném lỗi; `GEMINI_BACKEND="vertex"` không có key thì không ném lỗi.

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
Dùng skill giao-task-agy giao task "C01 — Đo Gemini, khung gemini.ts" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/ai/__tests__/gemini.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Test X-11 đạt: khi `AI_DISABLED="true"`, yêu cầu trả về lỗi `ERR_AI_UNAVAILABLE`.
- [ ] Test X-12 đạt: kiểm tra khởi động đúng quy tắc cho cả hai backend `"studio"` và `"vertex"`.
- [ ] Bạn đã đăng số đo độ trễ thật 3 lần lên GitHub Issue chung, ghi rõ "đo 3 lần ngày 07/11".

```text
Task "C01 — Đo Gemini, khung gemini.ts" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/ai/gemini.ts src/server/ai/__tests__/gemini.test.ts
git commit -m "feat(ai): khung gọi Gemini, chọn kênh, ngắt khẩn cấp"
git pull --rebase origin main
git push -u origin c/C01-gemini-khung
gh pr create --base main --title "C01 — Đo Gemini, khung gemini.ts" --body "Closes #<số Issue>"
```

Đăng số đo độ trễ lên Issue chung, ghi rõ "đo 3 lần ngày 07/11". Vai A merge khi CI xanh.

## Tiếp theo

→ [C02](C02-bkt.md)
