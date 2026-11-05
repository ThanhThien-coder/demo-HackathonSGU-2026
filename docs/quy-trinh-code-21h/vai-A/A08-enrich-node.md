# A08 — Nối POST /api/enrich-node

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 20:00–22:00 (H+8 → H+10) |
| Nhánh | `a/A08-enrich-node` |
| Cần có trước | A07 (analyze-node), C03 (planNodeQuestions), C07 (đặt câu hỏi; trong lúc chờ thì mock) |
| Mở đường cho | A10, D07 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

**Cách nhanh:** nhắn AI `Làm phiếu A08`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b a/A08-enrich-node
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "A08 — Nối POST /api/enrich-node". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: A07 (analyze-node), C03 (planNodeQuestions), C07 (đặt câu hỏi; trong lúc chờ thì mock). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/03_API_VA_LUU_TRU.md` Mục 2, 6.1
- `docs/spec/02_CONTRACTS.md` Mục 5, 6, 7, 8
- `docs/spec/20_AI_GOI_VA_PROMPT.md` Mục 6
- `docs/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md` Mục 6
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 3.4, 4
- `docs/spec/00_QUYET_DINH.md` D-16, D-34, D-36, D-37, D-66
- `package.json`
- `src/`

## Được ghi
- `src/server/enrich.ts`
- `src/app/api/enrich-node/route.ts`
- `src/app/api/__tests__/enrich-node.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Viết `src/server/enrich.ts`: kiểm tra điều kiện node phải ở trạng thái `AVAILABLE` (nếu không trả `ERR_NODE_NOT_AVAILABLE`), đã có kết quả phân tích (nếu chưa có trả `ERR_ANALYSIS_NOT_READY`), nếu có một run đang dở thì trả lại đúng run cũ, không gọi AI (`docs/spec/50_TEST_VA_FIXTURE.md` Mục 3.4 D16).
3. B2: Viết route `src/app/api/enrich-node/route.ts` tạo run mới theo `docs/spec/03_API_VA_LUU_TRU.md` Mục 6.1: lập kế hoạch câu hỏi qua `planNodeQuestions`, gọi AI sinh câu hỏi, lưu danh sách câu hỏi + đáp án mẫu + `forbidden_external_keywords` vào bảng `node_runs`, cộng dồn `tokens_used`, ghi dòng `ai_usage`. Nếu mọi câu hỏi đều bị hỏng ⇒ ném lỗi `ERR_AI_REJECTED` và không tạo run. Phản hồi trả về không chứa đáp án của câu chưa hoàn thành (INV-07).
4. Viết test trong `src/app/api/__tests__/enrich-node.test.ts`.
5. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/app/api/__tests__/enrich-node.test.ts`
- Có test (mock AI hoặc mock DB) cho ca D11 của `docs/spec/50_TEST_VA_FIXTURE.md` Mục 3.4 (học viên thứ hai mở cùng node: trúng cache phân tích, câu hỏi vẫn sinh mới), tên test ghi mã ca.
- Test ca D16: gọi lại `enrich-node` khi có run đang dở trả lại đúng run cũ, không gọi AI.
- Test ca `ERR_AI_REJECTED`: khi mọi câu hỏi bị cổng gác loại bỏ thì không tạo run trong CSDL.
- Test ca X-02: phản hồi không lộ trường `reference_answer` hoặc `must_have_points` của các câu chưa hoàn thành.

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
Dùng skill giao-task-agy giao task "A08 — Nối POST /api/enrich-node" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/app/api/__tests__/enrich-node.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Test ca D16 kiểm tra tính idempotent khi run đang dở chạy đạt.
- [ ] Test ca `ERR_AI_REJECTED` khi AI từ chối sinh câu hỏi chạy đạt.
- [ ] Test ca X-02 kiểm tra không lộ đáp án mẫu của câu chưa kết thúc chạy đạt.

- [ ] Có test cho ca D11 của `docs/spec/50_TEST_VA_FIXTURE.md` Mục 3.4 và test đó xanh.
```text
Task "A08 — Nối POST /api/enrich-node" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/enrich.ts src/app/api/enrich-node/route.ts src/app/api/__tests__/enrich-node.test.ts
git commit -m "feat(api): enrich-node kiểm điều kiện, trả run dở, tạo run"
git pull --rebase origin main
git push -u origin a/A08-enrich-node
gh pr create --base main --title "A08 — Nối POST /api/enrich-node" --body "Closes #<số Issue>"
```

Báo Vai D và Vai C rằng endpoint enrich-node đã hoàn thành. Vai A merge khi CI xanh.

## Tiếp theo

→ [A09](A09-dockerfile.md)
