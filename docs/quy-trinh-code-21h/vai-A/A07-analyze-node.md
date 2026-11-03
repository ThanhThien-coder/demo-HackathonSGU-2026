# A07 — Nối POST /api/analyze-node

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 18:30–20:00 (H+6.5 → H+8) · **Lát dọc 1 lúc 20:00** |
| Nhánh | `a/A07-analyze-node` |
| Cần có trước | A06 (ingest), C06 (hàm phân tích; trong lúc chờ thì mock) |
| Mở đường cho | Lát dọc 1, D06, E06 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b a/A07-analyze-node
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "A07 — Nối POST /api/analyze-node". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/03_API_VA_LUU_TRU.md` Mục 2, 3.3, 6, 6.6
- `.kb/spec/02_CONTRACTS.md` Mục 5, 8
- `.kb/spec/20_AI_GOI_VA_PROMPT.md` Mục 1, 4
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 4 X-13, Mục 3.4
- `.kb/spec/00_QUYET_DINH.md` D-46, D-66
- `package.json`
- `src/`

## Được ghi
- `src/app/api/analyze-node/route.ts`
- `src/app/api/__tests__/analyze-node.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Viết route `src/app/api/analyze-node/route.ts`: kiểm tra quyền sở hữu phiên, kiểm tra hạn mức token (AI-06), tra cứu `ai_cache` theo khóa `.kb/spec/03_API_VA_LUU_TRU.md` Mục 3.3, gọi hàm phân tích của Vai C, ghi kết quả vào `ai_cache`, cộng dồn `tokens_used`, ghi nhận cờ `analysis_failed` khi kết quả trả về `null` (`.kb/spec/03_API_VA_LUU_TRU.md` Mục 6.6).
3. B2: Mỗi lời gọi AI thành công ghi 1 dòng vào bảng `ai_usage` ngoài transaction học; nếu trúng cache thì không ghi dòng nào (`.kb/spec/03_API_VA_LUU_TRU.md` Mục 6, X-13).
4. Viết test trong `src/app/api/__tests__/analyze-node.test.ts`.
5. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/app/api/__tests__/analyze-node.test.ts`
- Có test (mock AI hoặc mock DB) cho ca D7 của `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.4 (hết hạn mức thì mọi lời gọi AI mới trả `ERR_TOKEN_QUOTA_EXCEEDED`, trúng cache vẫn chạy), tên test ghi mã ca.
- Khi trúng cache: tính 0 token và không có dòng mới nào trong bảng `ai_usage`.
- Khi `tokens_used` vượt quota mà trượt cache: trả mã lỗi HTTP 429 `ERR_TOKEN_QUOTA_EXCEEDED`.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "A07 — Nối POST /api/analyze-node" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/app/api/__tests__/analyze-node.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Yêu cầu trúng cache tiêu tốn 0 token và không tạo bản ghi trong bảng `ai_usage`.
- [ ] Khi vượt hạn mức token của phiên mà trượt cache, route trả về `ERR_TOKEN_QUOTA_EXCEEDED`.
- [ ] Thử nghiệm thủ công: dán link repo demo ⇒ bản đồ tải thành công ⇒ bấm chọn node ⇒ Tab 1 nạp dữ liệu phân tích thật.

- [ ] Có test cho ca D7 của `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.4 và test đó xanh.
```text
Task "A07 — Nối POST /api/analyze-node" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/app/api/analyze-node/route.ts src/app/api/__tests__/analyze-node.test.ts
git commit -m "feat(api): /api/analyze-node, ghi ai_usage"
git pull --rebase origin main
git push -u origin a/A07-analyze-node
gh pr create --base main --title "A07 — Nối POST /api/analyze-node" --body "Closes #<số Issue>"
```

Chạy migration trên project production (`.kb/spec/05_HA_TANG_CLOUD.md` Mục 5), duyệt production lần đầu khi smoke test xanh, báo cả nhóm hoàn thành lát dọc 1. Vai A merge khi CI xanh.

## Tiếp theo

→ [A08](A08-enrich-node.md)
