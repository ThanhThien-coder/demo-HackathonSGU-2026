# C06 — Lời gọi `analyze-node`

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 18:30–20:00 (H+6.5 → H+8) · **Lát dọc 1 lúc 20:00** |
| Nhánh | `c/C06-analyze` |
| Cần có trước | C05 |
| Mở đường cho | A07, Lát dọc 1, E06 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

**Cách nhanh:** nhắn AI `Làm phiếu C06`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b c/C06-analyze
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "C06 — Lời gọi analyze-node". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: C05. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/20_AI_GOI_VA_PROMPT.md` Mục 1, 4, Test bắt buộc
- `docs/spec/21_AI_KIEM_VA_DUYET.md` Mục 3
- `docs/spec/02_CONTRACTS.md` Mục 1 (CONFIG phần AI), Mục 5.1
- `docs/spec/00_QUYET_DINH.md` D-03, D-46, D-51
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 3.4
- `package.json`
- `src/`

## Được ghi
- `src/server/ai/analyze.ts`
- `src/server/ai/prompts/analyze.ts`
- `src/server/ai/__tests__/analyze.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1 luồng phân tích, prompt, schema (docs/spec/20_AI_GOI_VA_PROMPT.md Mục 4, AI-15, AI-16, AI-17): hiện thực hàm `analyzeNode`, prompt hệ thống ANALYZE_SYSTEM, ghép MODE_A hoặc MODE_B và LOW_CONFIDENCE, ANALYZE_SCHEMA; luồng retry kèm phản hồi cổng gác AI-37; so sánh bản kết quả `better` (đầy đủ > skeleton_only > null).
3. B2 `toAnalysisView` (AI-18): chuyển đổi NodeAnalysis sang NodeAnalysisView gửi client (phần X-Ray); gắn file_path, số dòng cho skills và weak_points; tính `shared_files` liên quan.
4. Viết test trong `src/server/ai/__tests__/analyze.test.ts` cho các trường hợp AI-15, AI-18, AI-37 (lần 1 skeleton_only thì request 2 có `<guard_feedback>`).
5. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.


**Bắt buộc theo bản chạy thử** (chi tiết lỗi ở `docs/quy-trinh-code-21h/loi-can-sua.md`):
- **Điểm dở rỗng (lỗi C-06):** câu "Không chắc thì mảng rỗng" có thể làm model nhỏ không nêu điểm dở. Chạy 2 repo thật, đếm `weak_points` trước và sau cổng gác, ghi lý do bị chặn.
- **Câu vai trò và lời từng bước (lỗi C-07, D-81, D-84):** `summary` đúng 2 câu, câu 1 nói phần này giúp người dùng làm gì (thẻ vai trò dùng câu này); `steps[].text` viết cho người mới, vì tour hiện từng câu.
- **Trần token (lỗi C-02):** phân tích hết repo demo trên AI thật, đếm bài lỗi cắt chữ rồi mới chỉnh `LLM_MAX_OUTPUT_TOKENS`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/ai/__tests__/analyze.test.ts`
- Có test (mock AI) cho ca D2, D3 của `docs/spec/50_TEST_VA_FIXTURE.md` Mục 3.4, tên test ghi mã ca. D2 chỉ kiểm phần của `analyzeNode`: AI lỗi 2 lần thì trả `null` (phần `analysis_failed`, màu vàng, mở node con thuộc route của Vai A và giao diện của Vai D). D3: tên bịa ở phần chữ 2 lần thì trả `skeleton_only = true`, kỹ năng đã qua kiểm vẫn giữ.
- Test AI-15: lần 1 skeleton_only, lần 2 null thì giữ bản skeleton_only.
- Test AI-18: chuyển đổi toAnalysisView gắn đúng số dòng gốc và file_path cho từng kỹ năng.
- Test AI-37: lần 1 trả skeleton_only thì request 2 được bổ sung thẻ `<guard_feedback>` chứa mã lỗi.

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
Dùng skill giao-task-agy giao task "C06 — Lời gọi analyze-node" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/ai/__tests__/analyze.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Test AI-15 và AI-18 đạt: phân tích node và chuyển sang view hiển thị chính xác.
- [ ] Test AI-37 đạt: phản hồi cổng gác được truyền sang lượt gọi lại khi gặp bản khung.
- [ ] Báo cho Vai A chữ ký hàm `analyzeNode` để nối vào route `POST /api/analyze-node` (A07) kịp mốc Lát dọc 1.

- [ ] Có test cho ca D2, D3 của `docs/spec/50_TEST_VA_FIXTURE.md` Mục 3.4 và test đó xanh.
- [ ] Chạy AI thật trên repo demo, đọc phần điểm dở: không phải bài nào cũng rỗng (lỗi C-06).
- [ ] Chạy AI thật trên repo demo, có ít nhất 1 bài có điểm dở hợp lý, đọc tay nội dung, không chỉ xem test xanh.
- [ ] Đọc tay 3 bài: câu 1 của `summary` nói đúng việc của người dùng; lời từng bước đọc hiểu được khi chưa đọc code (lỗi C-07).
```text
Task "C06 — Lời gọi analyze-node" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/ai/analyze.ts src/server/ai/prompts/analyze.ts src/server/ai/__tests__/analyze.test.ts
git commit -m "feat(ai): phân tích node, chuyển bản phân tích sang view"
git pull --rebase origin main
git push -u origin c/C06-analyze
gh pr create --base main --title "C06 — Lời gọi analyze-node" --body "Closes #<số Issue>"
```

Báo Vai A chữ ký hàm `analyzeNode` để kịp lát dọc 1. Vai A merge khi CI xanh.

## Tiếp theo

→ [C07](C07-cau-hoi.md)
