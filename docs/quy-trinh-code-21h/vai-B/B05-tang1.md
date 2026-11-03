# B05 — Tầng 1: symbol, đồ thị gọi hàm, entry, chọn chế độ

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 17:30–18:30 (H+5.5 → H+6.5) |
| Nhánh | `b/B05-tang1` |
| Cần có trước | B01, B04 |
| Mở đường cho | B06 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b b/B05-tang1
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "B05 — Tầng 1: symbol, đồ thị gọi hàm, entry, chọn chế độ". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: B01, B04. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/11_ENGINE_DO_THI.md` Mục 0, 1, 2, 3, 4, 5, Test bắt buộc
- `docs/spec/12_ENGINE_MAU_ENTRY.md` Mục 1, 2, 3
- `docs/spec/02_CONTRACTS.md` Mục 1 (`CONFIG`), Mục 3, 4
- `package.json`
- `queries/`
- `src/`

## Được ghi
- `src/server/engine/graph/types.ts`
- `src/server/engine/graph/registry.ts`
- `src/server/engine/graph/parser.ts`
- `src/server/engine/graph/symbols.ts`
- `src/server/engine/graph/resolvers/`
- `src/server/engine/graph/callgraph.ts`
- `src/server/engine/graph/degraded.ts`
- `queries/`
- `src/server/engine/graph/__tests__/tang1.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B0: Tạo `src/server/engine/graph/types.ts` chứa kiểu nội bộ Tầng 1–2: các kiểu của `docs/spec/11_ENGINE_DO_THI.md` Mục 0 (`ExternalCall`, `RouteBinding`, `EntryPoint`, `Candidate`, `FunctionInfo` = `SymbolDefinition` thêm `params`, `locals`, `complexity`), `ParsedFile` (Mục 1: `{ path, language, tier, tree, source }`), `SymbolIndex` (Mục 2: `SymbolTable`, `ImportMap`, `FieldTypeMap`, `InterfaceImplMap`, `LocalSymbolIndex`). Kiểu có trong `@/contracts` (`SymbolDefinition`, `FunctionCallEdge`, `HybridArchitecturalNode`, `IngestionReport`…) thì `import type`, không khai báo lại.
3. B1: Viết `parseAll` trong `parser.ts` (B01 đã có `initParsers`, giữ nguyên) theo Mục 1 (ENG-12: tỉ lệ byte `ERROR` > `CONFIG.PARSE_ERROR_RATIO_MAX` ⇒ bỏ file, `skipped.parse_error++`, warning). Xây dựng bảng symbol `collectSymbols`, giải quyết import `resolveImports` trong `symbols.ts`, hoàn thiện `registry.ts` (chỉ điền `query_file`, `ingress_patterns`, `abstraction_kinds` cho 4 ngôn ngữ B01 đã có) và các resolver cho TS/JS và Python trong `src/server/engine/graph/resolvers/` kèm truy vấn Tree-sitter trong `queries/` theo Mục 2 (ENG-20, ENG-21, ENG-21b `is_exported` theo `docs/spec/12_ENGINE_MAU_ENTRY.md` Mục 3, ENG-22, ENG-23, ENG-24, ENG-25 phần `TS_JS` và `PYTHON`, ENG-27 ghi `import_source` cho import gói ngoài). Không làm resolver `JAVA`, `GO`, `DART` và Universal ENG-26 (chưa có grammar, xem `docs/doc-de-hieu/07_ke_hoach_21h.md` Mục 3 bước 1).
4. B2: Xây dựng đồ thị gọi hàm `buildCallGraph` trong `callgraph.ts` theo Mục 3 (ENG-30, ENG-31, ENG-32, ENG-33, ENG-34, ENG-35), nhận diện entry point theo `docs/spec/11_ENGINE_DO_THI.md` Mục 4 (ENG-40) với mẫu ở `docs/spec/12_ENGINE_MAU_ENTRY.md` Mục 1–2 (chỉ mẫu TS/JS và Python; React Native và `main` để B10), hiện thực phần chọn chế độ trong `degraded.ts` theo Mục 5 (ENG-51).
   - **Chốt tên hàm spec chưa đặt:** `findEntries(files: ParsedFile[], idx: SymbolIndex, graph: ReturnType<typeof buildCallGraph>, scope: string, report?: IngestionReport): EntryPoint[]` trong `callgraph.ts` (Mục 4: `REGISTERED` từ `graph.bindings`, `GENERIC` theo Mục 4 ý 3 dùng in-degree của `fileGraph(graph.edges)`; chỉ entry trong scope, ENG-05; sort theo `key`); `chooseMode(entries: EntryPoint[], parsedInScope: number): DegradedMode | null` trong `degraded.ts` (Mục 5). Phần dựng node `PROCEDURAL` (Mục 10) để B07.
   - **Chốt phạm vi mẫu entry (`12` Mục 1):** B05 làm 4 nhóm có dấu ✅ (Express/Koa-router/Fastify, NestJS, Flask, FastAPI) và entry chung `GENERIC` (`12` Mục 2 ý 1). Next.js (`pages/api/**`, `app/**/route.ts`, `app/**/page.tsx`), React Router, React Native, Expo Router và entry chương trình `PROGRAM` để B10.
   - **`queries/*.scm`:** đọc từ `path.join(process.cwd(), "queries", <file>)` như grammar ở `parser.ts`, nạp 1 lần cùng `initParsers`. Dùng API `web-tree-sitter` 0.27 (README vai B: `Node`, `new Query(language, source)`). Capture đúng tên ở `11` Mục 1 ý 4 (`@def.function|method|class|interface|type|var`, `@name`, `@call`, `@import`). Chỉ dùng cây Tree-sitter, không regex văn bản thô (ENG-04); duyệt khóa đã sort (ENG-01); entry chỉ lấy trong scope (ENG-05).
5. Viết test trong `src/server/engine/graph/__tests__/tang1.test.ts`: T-ENG-12; test tên bắt đầu `ENG-12` cho `parseAll` (file 40% byte trong `ERROR` ⇒ bị bỏ, `parse_error` = 1, lấy input từ T-ENG-31); test tên bắt đầu `ENG-40` cho route của **cả 4 nhóm ✅** (Express, NestJS, Flask, FastAPI; code có mà không test thì không biết chạy đúng) (input `router.post('/checkout', …)` của T-ENG-08, kỳ vọng `RouteBinding.display_name` = `"router.post('/checkout')"`, có `middlewares`); test tên bắt đầu `ENG-51` cho chọn chế độ (input của T-ENG-25: 1 file Express 5 route ⇒ NORMAL, `main.py` không route 5 hàm ⇒ `PROCEDURAL`). T-ENG-08, T-ENG-09 làm ở B06; T-ENG-25, T-ENG-31 đầy đủ làm ở B07 (cần lát cắt, node). Test cần parser thì gọi `initParsers()` trong `beforeAll`. Tên test đầy đủ (gồm `describe`) bắt đầu bằng mã luật hoặc mã test. Bắt buộc có thêm test `ENG-31` cho: biến module `const svc = new Svc()` rồi `svc.m()` trong handler ẩn danh ⇒ cạnh `RESOLVED` tới `Svc.m` (ENG-22, ENG-31 (3)); không có cạnh tự trỏ; không có cạnh tới `CLASS` (ENG-30). Lần tập, 3 lỗi này lọt qua B05 và chỉ lộ ra ở T-ENG-08 của B06. Thêm 4 lỗi lộ ra khi chạy thật ở B07: (a) tìm hàm bao quanh call site phải khớp theo dòng kết thúc + tên, vì `line_start` tính từ decorator đầu (ENG-20), khớp ±1 dòng làm mất cạnh khi method có ≥ 2 decorator (NestJS `@Post` + `@UseGuards`, Flask `@route` + `@login_required`); (b) tiền tố mount: `R.use(prefix, R2)` (cả `R2` import từ file khác), `APIRouter(prefix=)`, `Blueprint(url_prefix=)`, `include_router(r, prefix=)`, `register_blueprint(bp, url_prefix=)` ⇒ ghép vào `binding.path` (không đổi `display_name` và khóa handler); (c) Flask `methods=[…]`, mọi decorator khác là middleware (không lọc theo tên), FastAPI `Depends(fn)` là middleware; (d) `display_name` Python lấy đúng receiver (`@router.post`, không cứng `@app.`).
6. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/server/engine/graph/__tests__/tang1.test.ts`
- Có đủ test T-ENG-12 và các test `ENG-12`, `ENG-40`, `ENG-51` nêu ở Việc cần làm, tất cả chạy xanh.
- Đồ thị gọi hàm và danh sách entry nhận diện chính xác các route handler của Express và NestJS.
- Kiểu nội bộ Tầng 1–2 chỉ khai báo ở `graph/types.ts`, không file nào khai báo lại.
- `npx vitest run src/server/engine` vẫn xanh (B01–B04 không hỏng) và `npx eslint src/server/engine` 0 error, 0 warning.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Kiểu nội bộ (spec ghi `// nội bộ`) chỉ khai báo ở `src/server/engine/ingest/types.ts` (Tầng 0) hoặc `src/server/engine/graph/types.ts` (Tầng 1–2); file khác `import type` từ đó. Không khai báo lại kiểu đã có ở `@/contracts` hay `types.ts`, không đổi tên hay xóa trường đã có. Cần đổi kiểu phiếu trước đã tạo thì đổi trạng thái `kẹt` và ghi rõ kiểu nào.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không ghi file ra đĩa, không `Math.random`, không dùng đồng hồ; sort chuỗi bằng `.sort()` mặc định, không `localeCompare` (ENG-01).
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "B05 — Tầng 1: symbol, đồ thị gọi hàm, entry, chọn chế độ" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/server/engine/graph/__tests__/tang1.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] `npx vitest run src/server/engine` và `npx eslint src/server/engine` đều sạch.
- [ ] Có test T-ENG-12 và các test `ENG-12`, `ENG-40`, `ENG-51`.
- [ ] `src/server/engine/graph/types.ts` có các kiểu Mục 0, `ParsedFile`, `SymbolIndex`.
- [ ] Đồ thị gọi hàm giải quyết chính xác các cuộc gọi qua interface và import tương đối trong TS/JS.

```text
Task "B05 — Tầng 1: symbol, đồ thị gọi hàm, entry, chọn chế độ" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/engine/graph/types.ts src/server/engine/graph/parser.ts src/server/engine/graph/registry.ts src/server/engine/graph/symbols.ts src/server/engine/graph/resolvers/ queries/
git commit -m "feat(engine): bảng symbol, resolver TS/JS, Python"
git add src/server/engine/graph/callgraph.ts src/server/engine/graph/degraded.ts src/server/engine/graph/__tests__/tang1.test.ts
git commit -m "feat(engine): đồ thị gọi hàm, entry, chế độ"
git pull --rebase origin main
git push -u origin b/B05-tang1
gh pr create --base main --title "B05 — Tầng 1: symbol, đồ thị gọi hàm, entry, chọn chế độ" --body "Closes #<số Issue>"
```

Vai A merge khi CI xanh.

## Tiếp theo

→ [B06](B06-lat-cat.md)
