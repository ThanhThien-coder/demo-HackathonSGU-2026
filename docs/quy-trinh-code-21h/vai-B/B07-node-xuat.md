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
- `docs/spec/11_ENGINE_DO_THI.md` Mục 0, 9, 10, 11, 12, 13, 14, 15, Test bắt buộc
- `docs/spec/10_ENGINE_INGEST.md` Mục 0 (chữ ký `runIngest`)
- `docs/spec/02_CONTRACTS.md` Mục 1 (`CONFIG`), Mục 3, 4
- `docs/spec/00_QUYET_DINH.md` D-07, D-08, D-12, D-55, D-56
- `package.json`
- `src/`

## Được ghi
- `src/server/engine/graph/types.ts`
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
2. B1: Viết node thuật toán theo D-56 trong `nodes.ts` (ENG-90, ENG-91), hoàn thiện chế độ suy biến `PROCEDURAL` trong `degraded.ts` (ENG-102), ghép node, sinh id tất định theo D-08, dựng cạnh theo D-07, Display Budget tối đa `CONFIG.DISPLAY_MAX_NODES` node và bầu chọn Capstone theo D-12 trong `nodes.ts` theo `docs/spec/11_ENGINE_DO_THI.md` Mục 9, 10, 11 (ENG-110, ENG-111, ENG-112, ENG-114).
3. B2: Viết chẩn đoán Uncle Bob trong `unclebob.ts` theo Mục 12 (ENG-120), đặt tên tất định 0 token AI qua 5 bậc thang trong `naming.ts` theo Mục 13, tính toán bố cục Dagre với hàng điểm bắt đầu trên cùng theo D-55 trong `layout.ts` theo Mục 14.
4. B3: Xây dựng whitelist symbol `buildSymbolWhitelist` trong `whitelist.ts` (D-19), thu thập `file_index`, viết hàm `mainPath` (ENG-155), điều phối `buildGraph` trong `src/server/engine/graph/index.ts` (gọi lần lượt `parseAll`, `collectSymbols`, `buildCallGraph`, chọn chế độ, Tarjan, PageRank, độ phức tạp, `buildSlice` mà B05, B06 đã viết, không viết lại), hàm `runEngine` và `toClientResult` trong `src/server/engine/index.ts` theo Mục 15. `runEngine` = `runIngest` (B04) rồi `buildGraph`, chỉ ingest 1 lần. Spec chưa ghi `runEngine` lấy `AbortSignal` ở đâu để truyền cho `runIngest(src, signal)`: thêm tham số thứ hai tùy chọn `signal?: AbortSignal` và ghi vào báo cáo để Vai A (A06) truyền vào. Vượt `CONFIG.ENGINE_BUDGET_MS` chỉ sinh warning (ENG-02). Lỗi `ERR_NO_ARCHITECTURAL_SLICE` ném `IngestionError` của `src/server/engine/ingest/types.ts`.
5. Chốt các điểm spec để hở:
   - **Tên hàm Mục 9–14** (Mục 15 giữ tên spec: `buildSymbolWhitelist`, `toClientResult`, `mainPath`, `buildGraph`, `runEngine`): `buildAlgoCandidates(fns: FunctionInfo[], ctx: EngineContext): Candidate[]` (Mục 9, `nodes.ts`); `buildProceduralCandidates(files: ParsedFile[], ctx: EngineContext): Candidate[]` (Mục 10, `degraded.ts`); `assembleGraph(candidates: Candidate[], ctx: EngineContext, report: IngestionReport): { nodes: HybridArchitecturalNode[]; edges: GraphEdge[] }` (Mục 11: gộp, id, cạnh, Display Budget, Capstone, `nodes.ts`); `diagnoseUncleBob(node, fileGraph, ctx)` (Mục 12); `nameCandidate(c: Candidate, ctx: EngineContext)` trả `{ base_title, title_source, title_evidence }` và `dedupeTitles(nodes)` (Mục 13 ý 9, sau Display Budget); `layoutGraph(nodes, edges): void` gán `position` (Mục 14).
   - **`buildGraph` là `async`**: spec ghi `buildGraph(input): StaticEngineResult` nhưng phải gọi `parseAll` (B05, `async`) ⇒ chốt `buildGraph(input: IngestOutput): Promise<StaticEngineResult>`; `runEngine(src, signal?)` = `await runIngest` rồi `await buildGraph`.
   - **`hash6(s)`** = 6 ký tự hex đầu của SHA-1 (UTF-8) bằng `node:crypto` (D-08, ENG-111); kiểm bằng id kỳ vọng của T-ENG-18.
   - **Input test**: dựng zip trong RAM bằng `fflate` ⇒ `runIngest({ kind: "ZIP_UPLOAD", … })` ⇒ `buildGraph` (không tự dựng `StaticEngineResult` bằng tay, trừ test hàm thuần như `mainPath`, `toClientResult`). T-ENG-34: chạy 2 lần cùng zip, so `JSON.stringify` của `nodes`, `edges`, `symbol_whitelist` (không so `engine_ms`).
6. Viết test trong `src/server/engine/graph/__tests__/node.test.ts` bao phủ các ca T-ENG-14, T-ENG-15, T-ENG-18, T-ENG-19, T-ENG-21, T-ENG-22, T-ENG-23, T-ENG-25, T-ENG-27, T-ENG-28, T-ENG-29, T-ENG-30, T-ENG-31, T-ENG-32, T-ENG-33, T-ENG-34, T-ENG-35, T-ENG-36, T-ENG-37, T-ENG-38 (T-ENG-25, T-ENG-31 chạy đủ đường `buildGraph`; B05 mới kiểm phần chọn chế độ và `parseAll`).
7. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/server/engine`
- Có đủ các test T-ENG-14, T-ENG-15, T-ENG-18, T-ENG-19, T-ENG-21, T-ENG-22, T-ENG-23, T-ENG-25, T-ENG-27, T-ENG-28, T-ENG-29, T-ENG-30, T-ENG-31, T-ENG-32, T-ENG-33, T-ENG-34, T-ENG-35, T-ENG-36, T-ENG-37, T-ENG-38 và tất cả chạy xanh.
- Mọi điểm bắt đầu nằm cùng hàng trên cùng (D-55, T-ENG-37).
- Bản đồ giới hạn tối đa `CONFIG.DISPLAY_MAX_NODES` node (ENG-114).
- `npm run typecheck`, `npm test`, `npm run lint` (0 error; engine 0 warning) đều sạch.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Kiểu nội bộ (spec ghi `// nội bộ`) chỉ khai báo ở `src/server/engine/ingest/types.ts` (Tầng 0) hoặc `src/server/engine/graph/types.ts` (Tầng 1–2); file khác `import type` từ đó. Không khai báo lại kiểu đã có ở `@/contracts` hay `types.ts`, không đổi tên hay xóa trường đã có. Cần đổi kiểu phiếu trước đã tạo thì đổi trạng thái `kẹt` và ghi rõ kiểu nào.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không ghi file ra đĩa, không `Math.random`; đồng hồ chỉ dùng `performance.now()` cho `engine_ms`; sort bằng `.sort()` mặc định hoặc so số, không `localeCompare` (ENG-01). Tên test bắt đầu bằng mã T-ENG hoặc ENG. Giá trị giả giống khóa trong test theo luật README (hook quét khóa).
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "B07 — Ghép node, tên, bố cục, xuất runEngine" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/server/engine` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] `npm run typecheck`, `npm test`, `npm run lint` đều sạch.
- [ ] Có đầy đủ 20 test T-ENG từ T-ENG-14 đến T-ENG-38: T-ENG-14, T-ENG-15, T-ENG-18, T-ENG-19, T-ENG-21, T-ENG-22, T-ENG-23, T-ENG-25, T-ENG-27, T-ENG-28, T-ENG-29, T-ENG-30, T-ENG-31, T-ENG-32, T-ENG-33, T-ENG-34, T-ENG-35, T-ENG-36, T-ENG-37, T-ENG-38.
- [ ] `runEngine` chỉ gọi `runIngest` 1 lần. Báo Vai A chữ ký thật của `runEngine` (có `signal` hay không).
- [ ] Bố cục Dagre đặt mọi node có `prerequisites = []` ở cùng tọa độ `position.y` nhỏ nhất (D-55).
- [ ] Hàm `toClientResult` loại bỏ hoàn toàn `symbol_whitelist` và `suspicious_instruction_files` (T-ENG-33).

```text
Task "B07 — Ghép node, tên, bố cục, xuất runEngine" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/engine/graph/types.ts src/server/engine/graph/nodes.ts src/server/engine/graph/degraded.ts
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
