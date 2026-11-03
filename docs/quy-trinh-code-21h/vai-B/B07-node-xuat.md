# B07 — Ghép node, tên, bố cục, xuất runEngine

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 19:15–20:00 (H+7.25 → H+8) · **Lát dọc 1** |
| Nhánh | `b/B07-node-xuat` |
| Cần có trước | B06 |
| Mở đường cho | Lát dọc 1, E06, B08 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b b/B07-node-xuat
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "B07 — Ghép node, tên, bố cục, xuất runEngine". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: B06. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `.kb/spec/11_ENGINE_DO_THI.md` Mục 9, 10, 11, 12, 13, 14, 15, Test bắt buộc
- `.kb/spec/02_CONTRACTS.md` Mục 1 (`CONFIG`), Mục 3, 4
- `.kb/spec/00_QUYET_DINH.md` D-07, D-08, D-12, D-55, D-56
- `package.json`
- `src/`

## Được ghi
- `src/server/engine/graph/nodes.ts`
- `src/server/engine/graph/degraded.ts`
- `src/server/engine/graph/naming.ts`
- `src/server/engine/graph/unclebob.ts`
- `src/server/engine/graph/layout.ts`
- `src/server/engine/graph/whitelist.ts`
- `src/server/engine/graph/index.ts`
- `src/server/engine/index.ts`
- `src/server/engine/graph/__tests__/node.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Viết node thuật toán theo D-56 trong `nodes.ts` (ENG-90, ENG-91), hoàn thiện chế độ suy biến `PROCEDURAL` trong `degraded.ts` (ENG-102), ghép node, sinh id tất định theo D-08, dựng cạnh theo D-07, Display Budget tối đa `CONFIG.DISPLAY_MAX_NODES` node và bầu chọn Capstone theo D-12 trong `nodes.ts` theo `.kb/spec/11_ENGINE_DO_THI.md` Mục 9, 10, 11 (ENG-110, ENG-111, ENG-112, ENG-114).
3. B2: Viết chẩn đoán Uncle Bob trong `unclebob.ts` theo Mục 12 (ENG-120), đặt tên tất định 0 token AI qua 5 bậc thang trong `naming.ts` theo Mục 13, tính toán bố cục Dagre với hàng điểm bắt đầu trên cùng theo D-55 trong `layout.ts` theo Mục 14.
4. B3: Xây dựng whitelist symbol `buildSymbolWhitelist` trong `whitelist.ts` (D-19), thu thập `file_index`, viết hàm `mainPath` (ENG-155), điều phối `buildGraph` trong `src/server/engine/graph/index.ts`, hàm `runEngine` và `toClientResult` trong `src/server/engine/index.ts` theo Mục 15.
5. Viết test trong `src/server/engine/graph/__tests__/node.test.ts` bao phủ các ca T-ENG-14, T-ENG-15, T-ENG-18, T-ENG-19, T-ENG-21, T-ENG-22, T-ENG-23, T-ENG-27, T-ENG-28, T-ENG-29, T-ENG-30, T-ENG-32, T-ENG-33, T-ENG-34, T-ENG-35, T-ENG-36, T-ENG-37, T-ENG-38.
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/engine`
- Có đủ các test T-ENG-14, T-ENG-15, T-ENG-18, T-ENG-19, T-ENG-21, T-ENG-22, T-ENG-23, T-ENG-27, T-ENG-28, T-ENG-29, T-ENG-30, T-ENG-32, T-ENG-33, T-ENG-34, T-ENG-35, T-ENG-36, T-ENG-37, T-ENG-38 và tất cả chạy xanh.
- Mọi điểm bắt đầu nằm cùng hàng trên cùng (D-55, T-ENG-37).
- Bản đồ giới hạn tối đa `CONFIG.DISPLAY_MAX_NODES` node (ENG-114).

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
Dùng skill giao-task-agy giao task "B07 — Ghép node, tên, bố cục, xuất runEngine" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/engine` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Có đầy đủ 18 test T-ENG từ T-ENG-14 đến T-ENG-38: T-ENG-14, T-ENG-15, T-ENG-18, T-ENG-19, T-ENG-21, T-ENG-22, T-ENG-23, T-ENG-27, T-ENG-28, T-ENG-29, T-ENG-30, T-ENG-32, T-ENG-33, T-ENG-34, T-ENG-35, T-ENG-36, T-ENG-37, T-ENG-38.
- [ ] Bố cục Dagre đặt mọi node có `prerequisites = []` ở cùng tọa độ `position.y` nhỏ nhất (D-55).
- [ ] Hàm `toClientResult` loại bỏ hoàn toàn `symbol_whitelist` và `suspicious_instruction_files` (T-ENG-33).

```text
Task "B07 — Ghép node, tên, bố cục, xuất runEngine" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/engine/graph/nodes.ts src/server/engine/graph/degraded.ts
git commit -m "feat(engine): ghép node, node thuật toán"
git add src/server/engine/graph/naming.ts src/server/engine/graph/unclebob.ts src/server/engine/graph/layout.ts
git commit -m "feat(engine): tên tất định, bố cục"
git add src/server/engine/graph/whitelist.ts src/server/engine/graph/index.ts src/server/engine/index.ts src/server/engine/graph/__tests__/node.test.ts
git commit -m "feat(engine): runEngine, toClientResult"
git pull --rebase origin main
git push -u origin b/B07-node-xuat
gh pr create --base main --title "B07 — Ghép node, tên, bố cục, xuất runEngine" --body "Closes #<số Issue>"
```

Việc của người: báo Vai A, Vai D, Vai E engine thật đã merge để kịp mốc Lát dọc 1 lúc 20:00. Vai A merge khi CI xanh.

## Tiếp theo

→ [B08](B08-repo-demo.md)
