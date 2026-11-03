# B06 — Xếp hạng, độ phức tạp, lát cắt

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 18:30–19:15 (H+6.5 → H+7.25) |
| Nhánh | `b/B06-lat-cat` |
| Cần có trước | B05 |
| Mở đường cho | B07 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b b/B06-lat-cat
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "B06 — Xếp hạng, độ phức tạp, lát cắt". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: B05. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/11_ENGINE_DO_THI.md` Mục 0, 6, 7, 8, Test bắt buộc
- `docs/spec/02_CONTRACTS.md` Mục 1 (`CONFIG`), Mục 3, Mục 4 (`SymbolDefinition`, `FunctionCallEdge`)
- `package.json`
- `src/`

## Được ghi
- `src/server/engine/graph/types.ts`
- `src/server/engine/graph/tarjan.ts`
- `src/server/engine/graph/pagerank.ts`
- `src/server/engine/graph/complexity.ts`
- `src/server/engine/graph/slicing.ts`
- `src/server/engine/graph/__tests__/lat-cat.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Viết `tarjan.ts` tìm thành phần liên thông mạnh SCC theo `docs/spec/11_ENGINE_DO_THI.md` Mục 6 (ENG-60), viết `pagerank.ts` tính PageRank trên DAG co cụm theo Mục 6 (ENG-62), viết `complexity.ts` tính Cognitive Complexity theo chuẩn SonarQube và xác định hàm VIP theo Mục 7 (ENG-71, ENG-74).
3. B2: Viết `slicing.ts` thực hiện cắt lát gọi hàm Forward Slicing từ entry point, lọc dữ liệu liên quan `DATA_SINK`, gán layer kiến trúc, áp dụng hard clamp và trần kích thước node theo Mục 8 (ENG-80, ENG-81, ENG-82, ENG-86, ENG-87, ENG-88, ENG-89). Thêm `EngineContext` (tham số `ctx` của `buildSlice`, gom đồ thị hàm, `ExternalCall[]`, `SymbolIndex`, `ParsedFile[]` mà Mục 8 cần) vào `graph/types.ts`. Dùng lại `Candidate`, `EntryPoint`, `ExternalCall` B05 đã khai báo, không khai báo lại.
4. Viết test trong `src/server/engine/graph/__tests__/lat-cat.test.ts` bao phủ các ca T-ENG-01, T-ENG-02, T-ENG-05, T-ENG-06, T-ENG-08, T-ENG-09, T-ENG-10, T-ENG-11 (T-ENG-08, T-ENG-09 chuyển từ B05 sang vì kỳ vọng là bước lát cắt và marker).
5. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/server/engine/graph/__tests__/lat-cat.test.ts`
- Có đủ các test T-ENG-01, T-ENG-02, T-ENG-05, T-ENG-06, T-ENG-08, T-ENG-09, T-ENG-10, T-ENG-11 và tất cả chạy xanh.
- Điểm Cognitive Complexity tính chính xác: cấu trúc `else if` không cộng thêm mức lồng (T-ENG-02).

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Kiểu nội bộ (spec ghi `// nội bộ`) chỉ khai báo ở `src/server/engine/ingest/types.ts` (Tầng 0) hoặc `src/server/engine/graph/types.ts` (Tầng 1–2); file khác `import type` từ đó. Không khai báo lại kiểu đã có ở `@/contracts` hay `types.ts`, không đổi tên hay xóa trường đã có. Cần đổi kiểu phiếu trước đã tạo thì đổi trạng thái `kẹt` và ghi rõ kiểu nào.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "B06 — Xếp hạng, độ phức tạp, lát cắt" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/server/engine/graph/__tests__/lat-cat.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Có đầy đủ các test T-ENG-01, T-ENG-02, T-ENG-05, T-ENG-06, T-ENG-08, T-ENG-09, T-ENG-10, T-ENG-11.
- [ ] Lát cắt tuân thủ đúng giới hạn dòng và token theo `CONFIG.NODE_MAX_LINES` và `CONFIG.NODE_MAX_CODE_TOKENS`.

```text
Task "B06 — Xếp hạng, độ phức tạp, lát cắt" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/engine/graph/tarjan.ts src/server/engine/graph/pagerank.ts src/server/engine/graph/complexity.ts
git commit -m "feat(engine): tarjan, pagerank, độ phức tạp"
git add src/server/engine/graph/types.ts src/server/engine/graph/slicing.ts src/server/engine/graph/__tests__/lat-cat.test.ts
git commit -m "feat(engine): cắt lát gọi hàm"
git pull --rebase origin main
git push -u origin b/B06-lat-cat
gh pr create --base main --title "B06 — Xếp hạng, độ phức tạp, lát cắt" --body "Closes #<số Issue>"
```

Vai A merge khi CI xanh.

## Tiếp theo

→ [B07](B07-node-xuat.md)
