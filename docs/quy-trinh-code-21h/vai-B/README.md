# Vai B — Engine: Tầng 0 tải và lọc, Tầng 1 cú pháp và đồ thị, Tầng 2 lát cắt và bố cục

Bạn chịu trách nhiệm toàn bộ tầng lõi phân tích mã nguồn (Engine Tầng 0–2): tiếp nhận và tải kho mã nguồn GitHub hoặc tệp zip trong RAM, lọc rác và che dữ liệu nhạy cảm, phân tích cú pháp AST bằng Tree-sitter, xây dựng đồ thị gọi hàm, cắt lát hành vi theo các entry point, xếp hạng bằng PageRank và Cognitive Complexity, ghép node kiến trúc và tính toán bố cục trực quan hóa tất định mà không tiêu tốn token AI.

Đọc chung: [README tổng](../README.md) · lịch gốc [`07`](../../doc-de-hieu/07_ke_hoach_21h.md)

## Một phiếu làm thế nào

Mỗi phiếu đọc từ trên xuống, làm đúng thứ tự:
1. Bước 0: tự gõ lệnh cập nhật `main`, cài thư viện, tạo nhánh.
2. Bước 1: copy prompt, dán cho Claude trên máy bạn. Claude kiểm các phiếu cần có trước đã có trên nhánh. **Thiếu thì Claude dừng**, báo thiếu gì và đó là việc của vai nào: bạn nhắn vai đó, không bảo Claude làm thay. Đủ thì Claude tạo task trong `.kb/tasks/`. Đọc task, thấy khớp phiếu thì đi tiếp.
3. Bước 2: copy prompt, dán cho Claude. Claude giao agy viết file, rồi tự kiểm và báo kết quả. Claude không commit.
4. Bước 3: bạn tự kiểm theo danh sách ô. Đủ hết ô mới là xong. Chưa đạt thì dán prompt làm lại (tối đa 1 lần).
5. Bước 4: bạn tự gõ lệnh commit, push, mở PR. Vai A merge.
6. Sang phiếu ở mục Tiếp theo.
AI không bao giờ commit hay push. Commit là của bạn: luật thi yêu cầu mọi thành viên phải có commit.

Máy không có Antigravity (agy) hoặc không có ai-kit: làm cùng phiếu này theo [`khong-co-ai-kit.md`](../khong-co-ai-kit.md).

## Lịch của bạn

| Giờ | Phiếu | Ghi chú |
| :-- | :-- | :-- |
| 12:00–13:00 | [B01](B01-grammar.md) · **Mốc H+1** | Thử 3 giả định curl codeload, nạp grammar Tree-sitter WASM |
| 13:00–14:30 | [B02](B02-ingest-tai.md) | Ingest 1: link GitHub, thăm dò probe, nhánh mặc định, tải zip trong RAM |
| 14:30–16:00 | [B03](B03-ingest-loc.md) · **Mốc H+4** | Ingest 2: mục lục zip, phân loại entry, monorepo scope, giải nén có giới hạn |
| 16:00–17:30 | [B04](B04-ingest-van-tay.md) | Ingest 3: notebook, vue, che secret và PII, vân tay dự án, `runIngest` |
| 17:30–18:30 | [B05](B05-tang1.md) | Tầng 1: symbol, resolver TS/JS và Python, callgraph, entry, chọn chế độ |
| 18:30–19:15 | [B06](B06-lat-cat.md) | Xếp hạng Tarjan/PageRank, độ phức tạp Cognitive Complexity, lát cắt gọi hàm |
| 19:15–20:00 | [B07](B07-node-xuat.md) · **Lát dọc 1 (20:00)** | Ghép node, node thuật toán, Uncle Bob, tên tất định, layout, xuất `runEngine` |
| 20:00–22:00 | [B08](B08-repo-demo.md) | Chạy thử repo demo Q-03, kiểm tra tất định, hàng điểm bắt đầu |
| 22:00–00:30 | [B09](B09-tai-chon-loc.md) | Ingest repo lớn: tải chọn lọc GitHub API khi zip bị cắt (D-63) |
| 00:30–03:00 | [B10](B10-python-mobile.md) · **Mốc H+16** | Hoàn thiện Python resolver, entry chương trình `main`, màn hình React Native |
| 03:00–05:00 | 💤 Ngủ | Nghỉ ngơi dưỡng sức, Vai A và Vai C tiếp tục xử lý tích hợp và duyệt tay |
| 05:00–09:00 | Về đích (xem bên dưới) | Sửa lỗi có nhãn bug, chạy test tất định T-ENG-34 trước mọi PR |

## Việc lặp lại suốt 21 giờ

- **Vai B nằm trên đường găng của dự án:** B05–B07 phải hoàn thành khoảng 20:00 để kịp mốc Lát dọc 1. Mỗi bước xong là mở PR ngay để Vai A merge sớm, không gom nhiều phiếu thành một PR.
- **Phối hợp đầu ra:** Bất kỳ thay đổi nào về cấu trúc kết quả đầu ra engine (`StaticEngineResult`, `ClientStaticEngineResult`, định dạng node, cạnh, thuộc tính) đều phải thông báo ngay cho Vai D (hiển thị canvas) và Vai E (kiểm thử fixture).
- **Ưu tiên xử lý lỗi:** Sau mốc 20:00, ưu tiên số một là xử lý các Issue có nhãn `engine` do Vai E báo khi chạy thử nghiệm trên các kho mã nguồn thực tế.

## Kiểu dữ liệu: để ở đâu, phiếu nào tạo

Spec ghi nhiều kiểu là `// nội bộ` (chỉ engine dùng, không có trong `src/contracts`). Để các phiếu không tự khai báo mỗi nơi một kiểu, mọi kiểu nội bộ chỉ nằm ở 2 file. Phiếu sau chỉ thêm kiểu mới, không sửa kiểu phiếu trước đã tạo.

| File | Phiếu tạo | Kiểu | Phiếu thêm sau |
| :-- | :-- | :-- | :-- |
| `src/contracts/*` (Vai A, A02) | A02 | `CONFIG`, `LanguageAdapter`, `SymbolDefinition`, `FunctionCallEdge`, `IngestSource`, `IngestOutput`, `IngestionReport`, `IngestionErrorCode`, `StaticEngineResult`… | Không ai trong vai B được sửa. Thiếu thì báo Vai A |
| `src/server/engine/ingest/types.ts` | B02 | `ResolvedRef`, `RawArchive`, lớp `IngestionError` (có `code: IngestionErrorCode`) | B03: `ZipEntryMeta`, `EntryClass`, `ClassifiedEntry`, `ScopeDecision`, `LanguageRegistry` (`{ adapters, known_no_grammar }`) · B04, B09 nếu cần |
| `src/server/engine/graph/types.ts` | B05 | `ExternalCall`, `RouteBinding`, `EntryPoint`, `Candidate`, `FunctionInfo`, `ParsedFile`, `SymbolIndex` | B06: `EngineContext` · B07, B10 nếu cần |

Lỗi của cả Tầng 0 và Tầng 1–2 (kể cả `ERR_NO_ARCHITECTURAL_SLICE`) đều ném `IngestionError`. Vai A (A06) bắt lỗi này và đổi `code` thành `ApiError`.

Từ B02 trở đi, lệnh kiểm của mọi phiếu đều chạy `npx tsc --noEmit` trước `vitest`, để bắt sớm chỗ hai phiếu hiểu một kiểu khác nhau.

## Luật chung khi spec để hở (rút ra từ lần tập B01–B03)

- **Hàm spec không nhận `report` nhưng luật cần đếm `skipped.*` hoặc ghi warning** (vd. `readCentralDirectory`, `classifyEntry`, `detectScope`, `computeSnapshot`): thêm tham số tùy chọn `report?: IngestionReport` ở **cuối** chữ ký, giữ nguyên thứ tự và kiểu các tham số spec đã ghi. Cách này cũng dùng cho `runEngine(src, signal?)` ở B07.
- **Spec không ghi con số** ⇒ không tự đặt, lấy từ `CONFIG`. **Spec ghi "+ warning" mà không có câu chữ** ⇒ dùng câu tạm (số trong câu lấy từ `CONFIG`), đặt comment ngay trên `// Câu tạm, spec chưa có câu chữ, chờ người giữ spec chốt` và liệt kê trong báo cáo task.
- **Khóa giả trong test** (T-ING-26, T-ING-27…): hook pre-commit của ai-kit (`quet-khoa.mjs`) chặn mọi chuỗi giống khóa thật (`-----BEGIN … PRIVATE KEY-----`, `AKIA…`, `ghp_…`, `sk-…`, `AIza…`). Trong test dựng bằng cách ghép chuỗi (vd. `"-----BEGIN RSA " + "PRIVATE KEY-----"`) kèm comment "khóa giả". Hook còn chặn cả **phép gán** `secret|token|password|api_key = "<chuỗi ≥ 16 ký tự>"`, trừ khi giá trị chứa `example`, `your`, `placeholder`, `xxxx`, `changeme`: giá trị giả trong test đặt dạng `"example-jwt-secret"`. Không bỏ qua hook bằng `--no-verify`.
- **Zip mẫu trong test có segment đầu chung** (vd. mọi file đều trong `src/`) ⇒ ING-60.3 cắt segment đó, path thành `index.ts` chứ không phải `src/index.ts`. Muốn giữ `src/` thì thêm 1 file ở gốc zip (vd. `README.md`).
- **API `web-tree-sitter` 0.27 (bản đã pin), dùng cho B05–B10:** kiểu nút là `Node` (`import { Node, Query, Tree, Language } from "web-tree-sitter"`), không có `SyntaxNode`; tạo truy vấn bằng `new Query(language, source)` rồi `query.captures(node)` / `query.matches(node)`, không có `language.query()`. AI hay viết theo API cũ (≤ 0.20) ⇒ `tsc` đỏ. Viết query `.scm` thì in `tree.rootNode.toString()` của đoạn code mẫu để xem cây thật trước (vd. decorator NestJS nằm trước `method_definition` trong `class_body`).
- **Index của `web-tree-sitter` (JS) là đơn vị UTF-16, không phải byte UTF-8** (đo thật với 0.27.1, dù typings ghi "byte"): `node.startIndex/endIndex` cắt thẳng được bằng `source.slice()`. Mọi tỉ lệ, độ dài so với node (ENG-12, snippet, cửa sổ dòng ở B06) phải dùng `source.length`, không `Buffer.byteLength`, kẻo code có tiếng Việt bị tính sai.
- **Test từng hàm không đủ: B06, B07 phải có test chạy thật `runEngine`** trên zip dựng trong RAM: repo mẫu theo code spec 50 Mục 1.2 (Express + TypeORM, router mount `app.use("/api/orders", router)`) và 1 repo nhỏ cho mỗi framework ✅ (FastAPI, Flask, NestJS), kiểm tên node, thứ tự `layer` các bước, snippet có dòng gọi bước kế. Lần tập, toàn bộ test từng hàm xanh mà chạy thật lộ 7 lỗi (xem `src/server/engine/graph/__tests__/shop-mau.test.ts`, `framework-mau.test.ts`).
- **Service/repo import dạng instance** (`export const svc = new Svc()` rồi `import { svc }`, mẫu phổ biến nhất của Express): phân giải `svc.m()` phải tra kiểu ở **file nguồn** (ENG-22) rồi tìm `Svc.m`; không có đích thật thì ghi `ExternalCall`, không tạo cạnh tới khóa không tồn tại. Lần tập lỗi này lọt qua B05–B07, chỉ lộ ra ở B08. Phải test đủ **6 kiểu export**: `export const svc = new Svc()`, `export default new Svc()` (ghi `field_types[file#default]`), CommonJS `module.exports = new Svc()` + `require`, method `static`, `import * as ns`, instance tạo trong file container (xem `framework-mau.test.ts`).
- **Test không so `warnings` rỗng** khi chạy thật `runEngine`: warning vượt `CONFIG.ENGINE_BUDGET_MS` (ENG-02) xuất hiện khi CI tải nặng; lọc đúng câu cần kiểm.
- **Mẫu entry dựa đường dẫn (Next.js `app/**`, `pages/api/**`, Expo Router `app/**`) chỉ áp cho file TS/JS**: lần tập (B10) áp cả file Python trong `app/` ⇒ làm đỏ test Flask/FastAPI.
- **`jsx_attribute` của grammar tsx không có field `name`/`value`**: đọc qua `namedChild(0)`/`namedChild(1)` (`<Tab.Screen name=…>`, `<Route path=…>`).
- **ENG-81 cài đúng spec**: giữ callee khi giá trị trả về được dùng ở call site (gán, return, đối số, điều kiện) hoặc có `throw` trong **thân** callee; lần tập cài thành "callee có gọi tiếp" ⇒ lát cắt màn hình mobile cụt.
- **Sort chuỗi để tất định (ING-02, ENG-01):** dùng `.sort()` mặc định (UTF-16), không dùng `localeCompare` (phụ thuộc locale máy).
- **Thử lại và hẹn giờ của Tầng 0** (ING-40, ING-44) nằm ở `runIngest` (B04), vì zip hỏng chỉ phát hiện được khi đọc mục lục (B03). Hàm con chỉ nhận `signal` và ném `IngestionError`.
- **Tên test:** tên đầy đủ (gồm `describe` bọc ngoài) bắt đầu bằng mã luật hoặc mã test (`T-ING-07 …`, `ING-45 …`), không bắt đầu bằng tên task.
- **Test không đụng đĩa, không gọi mạng thật:** zip mẫu dựng trong RAM bằng `fflate`, mạng giả bằng mock `fetch`. File lớn trong test dùng nội dung giả ngẫu nhiên tất định (LCG, không `Math.random`): nội dung lặp lại nén vượt `CONFIG.MAX_COMPRESSION_RATIO` và bị chống zip bomb loại.
- **Câu chữ spec mâu thuẫn với bảng test** ⇒ bảng test thắng (số kỳ vọng lấy từ bảng); ghi cách hiểu đã chốt vào phiếu (vd. ROLE theo thư mục ở B03).
- **Mỗi phiếu chạy lại toàn bộ `npx vitest run src/server/engine`** và `npx eslint src/server/engine` (0 error, 0 warning) trước khi commit, để chắc không làm hỏng phiếu trước và CI không đỏ vì lint.
- **Kết quả Bước 0 của B01 (03/11):** codeload trả đúng mã cho `HEAD`; comment EOCD là SHA 40 hex; `archive/HEAD.zip` chuyển hướng tới **SHA** chứ không phải tên nhánh ⇒ `ref_label` hiện là SHA (giữ theo spec, chờ nhóm chốt).

## Việc cần chốt (gom từ lần tập B01–B07)

Các chỗ spec tự mâu thuẫn, chưa nói, hoặc code phải làm khác câu chữ spec. "Chốt" = nhóm chọn 1 cách, ghi `D-xx` vào `docs/spec/00_QUYET_DINH.md` và sửa câu chữ spec chỗ đó, rồi sửa code/phiếu theo. Chốt xong thì gạch dòng ở đây.

**Nên chốt trước buổi demo**

| # | Chỗ | Hiện code làm gì | Đề xuất | Ảnh hưởng |
| :-: | :-- | :-- | :-- | :-- |
| 1 | `11` Mục 8 ý 6 (dòng giữ trong lát cắt): middleware `try { req.user = jwt.verify(…); next(); } catch { 401 }` | Đúng luật hiện tại: dòng `jwt.verify` không phải hạt giống ⇒ bị lược, snippet chỉ còn `next()` trong `try` | Thêm luật: đã giữ `catch` thì giữ mọi câu lệnh cấp 1 trong `try` | Bước MIDDLEWARE của hầu hết repo Express (cả `shop-api` N2, N5) mất dòng quan trọng nhất; AI hỏi vào chỗ trống |
| 2 | `10` ING-32 `ref_label` | `archive/HEAD.zip` chuyển hướng tới SHA ⇒ `ref_label` = SHA 40 ký tự | Ref khớp 40 hex ⇒ `ref_label = null`, UI chỉ hiện `@ sha7` (hoặc gọi API lấy `default_branch`, tốn quota) | Màn hình "Tiếp tục học" hiện `shop-api · 43fca52d…(40 ký tự) @ 43fca52` |

**Không gấp (code đã chạy được, chỉ cần sửa câu chữ spec cho khớp)**

| # | Chỗ | Mâu thuẫn | Code đang làm | Việc cần làm |
| :-: | :-- | :-- | :-- | :-- |
| 3 | `11` Mục 13 ý 1 vs bảng T-ENG-18 | `TECH_TOKENS` có `route` nhưng bảng kỳ vọng `algo-find-shortest-route-acfab3` | Theo luật Mục 13 ⇒ `algo-find-shortest-acfab3` | Chọn: bỏ `route` khỏi `TECH_TOKENS` cho node thuật toán, hoặc sửa bảng T-ENG-18 |
| 4 | `10` Mục 8 ý 7 (ROLE theo thư mục) vs bảng T-ENG-16 | `server` ∈ ROLE_NAMES nhưng `server/tests/order.test.ts` kỳ vọng 1.3333 | Theo bảng test: file trong scope chỉ xét thư mục **sau** scope | Sửa câu chữ Mục 8 ý 7 |
| 5 | `11` Mục 0 chữ ký `buildGraph(input): StaticEngineResult` | Phải gọi `parseAll` (async) | `buildGraph(…): Promise<StaticEngineResult>` | Sửa chữ ký trong spec |
| 6 | `11` Mục 0 chữ ký `runEngine(src)` | `runIngest(src, signal)` cần `AbortSignal` | `runEngine(src, signal?)` | Sửa chữ ký trong spec; báo A06 |
| 7 | `11` ENG-12 "byte node ERROR / byte file" | `web-tree-sitter` (JS) trả index **UTF-16**, không phải byte | Tính ρ bằng đơn vị UTF-16 (`source.length`) | Sửa câu chữ ENG-12 |
| 8 | Chữ ký spec không nhận `report` (`readCentralDirectory`, `classifyEntry`, `detectScope`, `computeSnapshot`…) nhưng luật bắt đếm `skipped.*`/warning | — | Thêm `report?` ở cuối chữ ký | Ghi luật này vào spec `10` Mục 0 |
| 9 | Câu chữ warning spec chỉ ghi "+ warning" | Không có câu | Câu tạm, có comment `// Câu tạm…`: (a) GitHub rơi vào `ARCHIVE_HASH` (T-ING-33); (b) file lệch dòng sau khi che ⇒ bỏ (`10` Mục 11 ý 2); (c) manifest > `MAX_MANIFEST_BYTES` (`10` Mục 9 ý 2) | Chốt 3 câu, ghi vào spec |
| 10 | Phạm vi ngôn ngữ | `11` Mục 1 có Java/Go/Dart (`RESOLVED`), 9 ngôn ngữ `STRUCTURAL`, màn hình Flutter/Android/iOS (D-57) | Chưa phiếu nào làm; B01 chỉ có 4 grammar (TS, TSX, JS, Python); ca test các ngôn ngữ này là `it.todo` ở B10 | Chọn: thêm phiếu B11 hay ghi vào `07` Mục 3 là cắt |

**Thêm sau khi kiểm B09, B10**

| # | Chỗ | Hiện code làm gì | Đề xuất |
| :-: | :-- | :-- | :-- |
| 11 | `12` Mục 2 (entry `PROGRAM`): Python có `def main()` và `if __name__ == "__main__": main()` | Cả `<module>` và `main` đều là entry ⇒ 2 node gần trùng ("Tool", "Tool #2"); ENG-110 không gộp tập con | File có khối `__main__` gọi `main` cùng file ⇒ chỉ lấy `<module>` làm entry |
| 12 | `11` Mục 13 (tên ROUTE) với Next.js `pages/api/**` | Handler nhận mọi method ⇒ `method = "ALL"` ⇒ tên "ALL User" | Method `ALL` ⇒ bỏ động từ, chỉ lấy tài nguyên ("User") |
| 13 | `11` ENG-81 "cây con G có DATA_SINK" | Mới xét con trực tiếp; bù bằng heuristic "G có gọi tiếp ⇒ giữ" | Xét cả cây con (BFS) rồi bỏ heuristic |

**Việc vai khác cần làm (không phải chốt spec, đã báo)**

| Vai | Việc | Vì sao |
| :-- | :-- | :-- |
| ~~A (A09)~~ | ~~Thêm `./queries/*.scm` vào `outputFileTracingIncludes` của `/api/ingest` trong `next.config.ts` và vào Dockerfile~~ **Xong (PR #91)** | Engine đọc `.scm` bằng `fs`; thiếu thì Tầng 1 chết trên Vercel/Docker, test ở máy vẫn xanh |
| ~~A (A06)~~ | ~~Đổi `IngestionError` (`code`, `details`) sang `ApiHttpError` trước khi trả; `toErrorResponse` hiện coi lỗi lạ là `ERR_PERSISTENCE_UNAVAILABLE` | Link sai, repo rỗng… sẽ báo nhầm lỗi CSDL~~ **Xong (PR #93)** |
| ~~A (A06)~~ | ~~Dùng đúng chữ ký `runEngine(src, signal?)` + `toClientResult(result)`, không gọi `runIngest` riêng | Gọi cả hai là ingest 2 lần~~ **Xong (PR #93)** |

## Bạn chờ ai, ai chờ bạn

- **Bạn chờ các vai khác:**
  - Chờ A01 (12:30) để có cấu hình package và khung code trước khi nạp grammar.
  - Chờ A02 (13:00) để có đầy đủ contracts và bảng `CONFIG`. B01 `import type` từ `@/contracts` nên `tsc` đỏ tới khi A02 merge: viết trước được, nhưng mở PR B01 sau A02.
  - Chờ E03 để lấy hàm `maskSensitive` phục vụ che dữ liệu nhạy cảm ở B04.
- **Trong vai B:** B03 cần `LANGUAGE_REGISTRY`, `KNOWN_NO_GRAMMAR` của B01 để phân loại đuôi file. B05 viết tiếp `parseAll` vào `parser.ts` của B01.
- **Phạm vi ngôn ngữ:** B01 chỉ lấy 4 grammar (TS, TSX, JS, Python). Resolver Java / Go / Dart, tầng `STRUCTURAL`, màn hình Flutter / Android / iOS **chưa có phiếu nào làm**. Ca test của các ngôn ngữ này trong T-ENT-01, T-ENT-02 để `it.todo` ở B10.
- **Các vai khác chờ bạn:**
  - Vai A chờ B04 (`runIngest`) và B07 (`runEngine`) để hoàn thiện route `POST /api/ingest` (A06). `runEngine` đã gọi `runIngest` bên trong, nên A06 chỉ gọi `runEngine`.
  - Vai D và Vai E chờ bản đồ thực tế từ B07 lúc 20:00 để chuyển từ fixture sang hiển thị và kiểm thử hệ thống thật.
- **Phương án dự phòng nếu trễ mốc 20:00:**
  - Nếu đến 20:00 chưa có B07, cả nhóm tiếp tục chạy trên fixture `shop-api.json`.
  - Vai B kích hoạt cắt giảm phạm vi theo [`07`](../../doc-de-hieu/07_ke_hoach_21h.md) Mục 3 bước 1: bỏ resolver Java / Go / Dart, bỏ tầng `STRUCTURAL`, bỏ màn hình Flutter / Android / iOS, bỏ tải chọn lọc repo lớn (D-63). Bộ phân giải TS/JS và Python là trọng tâm bắt buộc, không bao giờ cắt.

## Về đích (05:00 → 09:00)

- Sau mốc đóng băng tính năng 05:00, bạn thức dậy và chỉ tiếp nhận xử lý các lỗi có GitHub Issue gắn nhãn `bug` liên quan đến engine hoặc ingest.
- Mỗi bản sửa lỗi phải được thực hiện trên nhánh riêng `b/fix-<issue>`.
- Trước khi mở PR sửa lỗi, luôn bắt buộc chạy lại kiểm tra tính tất định T-ENG-34 và toàn bộ bộ test engine (`npx vitest run src/server/engine`).
- Đối soát lại cùng Vai A để đảm bảo mọi commit của mình trên nhánh chính `main` đều sạch sẽ và tuân thủ quy định cuộc thi.
