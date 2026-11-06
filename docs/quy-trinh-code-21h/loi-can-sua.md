# Lỗi cần sửa sau khi deploy

Cập nhật ngày 05/11/2026, theo `main` commit `ab6ac69` trên https://demo-hackathon-sgu-2026.vercel.app/.

Tài liệu này ghi lỗi tìm được khi chạy thử site và kiểm tra code. Mỗi vai đọc phần của mình, sửa xong thì đổi **Trạng thái**.

## Cách dùng file này

File này là nơi duy nhất ghi lỗi và việc sửa lỗi. Không tạo file danh sách lỗi thứ hai.

- **Người test:** thêm lỗi vào cuối phần của vai theo [mẫu](#mẫu-thêm-lỗi), rồi cập nhật bảng Tóm tắt.
- **Agent:** làm theo [Quy trình cho agent](#quy-trình-cho-agent). Chỉ cần đưa cho agent file này.
- **Trưởng nhóm:** trả lời các câu ở [Cần nhóm quyết](#cần-nhóm-quyết). Lỗi đang chờ quyết thì agent bỏ qua.

**Đừng nhầm mã:** tiêu đề `### D-07` là **lỗi** của Vai D. Quyết định trong `docs/spec/00_QUYET_DINH.md` luôn được viết là "quyết định D-07" hoặc nằm trong câu nói về spec. Hai nơi trùng số nhưng khác nghĩa.

### Mẫu thêm lỗi

Mã mới lấy số kế tiếp của vai, không dùng lại mã đã bỏ (`D-02`, `A-06`). Hiện kế tiếp là `B-42`, `D-24`, `C-13`, `A-09`.

```markdown
### B-40 · Nặng | Vừa | Nhẹ · Tên ngắn

- **Hiện tượng:** thấy gì, ở repo nào, bài nào. Có thể làm lại theo các bước nào.
- **Nguyên nhân:** ghi nếu đã biết, chưa chắc thì ghi "nghi".
- **Cần sửa:** sửa gì, ở file nào.
- **Kiểm tra:** làm gì để biết đã hết lỗi.
- **Trạng thái:** chưa làm.
```

Trạng thái dùng một trong các giá trị: `chưa làm` · `cần xác minh` · `chờ quyết Q-x` · `đang làm` · `chờ kiểm` · `xong`. Chỉ người kiểm mới được ghi `xong`.

## Tóm tắt

| Vai | Nặng | Vừa | Nhẹ | Tổng |
| :-- | --: | --: | --: | --: |
| B — Engine | 6 | 18 | 16 | 40 |
| D — Giao diện | 4 | 10 | 8 | 22 |
| C — AI | 1 | 11 | 0 | 12 |
| A — Tích hợp, deploy | 1 | 4 | 2 | 7 |
| **Tổng** | **12** | **43** | **26** | **81** |

Bảng trên đã tính 12 lỗi ở mục [Lỗi mới ngày 06/11/2026](#lỗi-mới-ngày-06112026) và 11 việc ở mục [Việc mới theo quy trình học mới](#việc-mới-theo-quy-trình-học-mới).

Vai B có 38 mã: 33 mã gộp thành 23 nhóm sửa, xem mục **Vai B theo phiếu**, 5 mã mới chưa xếp nhóm.

- **Nặng:** ban giám khảo thấy ngay, hoặc chặn thao tác chính.
- **Vừa:** khó dùng, gây hiểu sai, hoặc khó tìm lỗi.
- **Nhẹ:** chưa ảnh hưởng nhiều tới người học.

## Thứ tự nên sửa

1. **B-01, B-02, B-03, B-06, B-07, B-27:** nội dung bài và ngôn ngữ đúng trước. Sửa xong phải đổi `ENGINE_VERSION`.
2. **D-05, D-07:** cửa sổ tràn màn hình và không bấm được node.
3. **D-12, C-03, C-04:** câu hỏi đúng và không lộ đáp án.
4. **D-01, B-04, B-05:** bản đồ đọc được và học theo cây.
5. **B-14, B-17, B-20, B-22, B-26, D-09, D-11, D-14, D-15, A-01:** các lỗi Vừa còn lại.

AI đã chạy. Lỗi cũ là app gửi `thinkingBudget: 0` nên Google trả 400, Phat107 đã sửa ở commit `e94055b`.

---

## Vai B theo phiếu

33 mã lỗi Vai B gộp được thành 23 nhóm, vì nhiều mã có chung nguyên nhân hoặc sửa chung một chỗ. Sửa theo nhóm, chi tiết từng mã nằm ở phần Vai B bên dưới.

Cột **Thử sửa** là kết quả sửa thử trên bản sao tạm rồi chạy repo thật. Bản sửa đó chưa nằm trong repo. Thử 9 nhóm cùng lúc: 160/161 test xanh, test đỏ ghi ở dòng B-03 + B-34.

- **Nguồn:** Code là sửa code. Spec là sửa spec trước, rồi sửa code và test.
- **Demo:** có nghĩa là ảnh hưởng buổi demo BrewLite.

| Phiếu | Mã | Lỗi | Nguồn | Sửa ở đâu | Demo | Thử sửa |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| B01 | B-07 | Thiếu ngôn ngữ, báo sai repo Java, Go, Dart | Phạm vi | Nhóm chốt, rồi `graph/registry.ts` | Không | Chưa thử |
| B01 | B-12 | Lỗi nạp query bị bỏ qua | Code | `graph/parser.ts` | Không | Chưa thử |
| B01 | B-13 | Grammar chưa nạp lúc khởi động | Code | Chỗ khởi động server, cùng A-04 | Có, request đầu chậm | Chưa thử |
| B02 | B-14 | Thăm dò GitHub dễ hết giờ | Spec | `PREFLIGHT_TIMEOUT_MS`, báo Vai A | Cần đo Vercel | Chưa thử |
| B02 | B-15 + B-21 | Sai hoa thường ở link và thư mục | Spec | `ingest/url.ts`, `ingest/fingerprint.ts` | Không | Chưa thử |
| B02 | B-16 | Hiện SHA thay tên nhánh | Spec | ING-32, `ingest/refs.ts`, cùng D-14 | Có | Chưa thử |
| B03 | B-17 | Monorepo chọn nhầm gói nhỏ | Spec | ING-80, `ingest/fingerprint.ts` | Không | Chưa thử |
| B03 | B-18 + B-19 | Zip độc chưa dừng, zip macOS sai gốc | Code, Spec | `ingest/unzip.ts`, `ingest/prune.ts` | Không | Chưa thử |
| B04 | B-22 | Che secret bỏ sót | Spec | ING-110, `ingest/secrets.ts` | Không | Một phần: `SECRET_KEY` của repo Django đã được che, chưa thêm token Stripe, Slack, URL `https` |
| B04 | B-09 + B-23 + B-24 | Vân tay đọc sai gói, sai ngôn ngữ | Code | B-09 chỉ lọc lúc hiển thị, không đổi `tech_stack`; B-23, B-24 ở `ingest/fingerprint.ts` | Có với B-09 | B-23 đã vá, chưa đo riêng; còn lại chưa thử |
| B05 | B-01 | NestJS hiện code method khác | Code | `graph/symbols.ts`, có ở `b/fix-nest-buoc-dau` | Có | Hết: BrewLite 9 → 17/17 bài có dòng đầu riêng |
| B05 | B-03 + B-34 | Nhận nhầm route: `config.get`, `msw` | Code | `graph/callgraph.ts` | Có với B-03 | Hết: route giả BrewLite 2 → 0, `bulletproof-react` 13 → 0. Luật handler phải vẫn nhận `const h = makeHandler(cfg)`, bản thử chặn nhầm nên 1 test đỏ |
| B05 | B-25 + B-26 | Đọc tsconfig sai, mất alias `@/` | Code | `graph/resolvers/ts_js.ts`, `ingest/fingerprint.ts` | Có khi chọn `frontend/` | Một phần: BrewLite 147 → 0, `taxonomy` 274 → 43, `full-stack-fastapi-template` 248 → 201. Phần còn lại chưa rõ nguyên nhân |
| B06 | B-06 | Prisma không tới tầng dữ liệu | Code | `graph/slicing.ts` | Có | Hết: BrewLite 0/19 → 14/17 |
| B06 | B-33 | Engine chậm khi nhiều route | Code | `graph/slicing.ts` | Không | Một phần: `django/django` 121 → 32 giây, còn chỗ chậm khác |
| B07 | B-02 + B-20 | File test thành bài học | Spec | ING-87, `graph/nodes.ts`, `ingest/priority.ts` | Có | Hết: file test BrewLite 1 → 0, `nestjs/nest` 12 → 0 |
| B07 | B-04 + B-05 | Bài rời rạc, mở sẵn quá nhiều | Spec | D-07, D-55, `graph/nodes.ts`, làm theo B-39 | Có | Chưa thử |
| B07 | B-27 | Lấy `<module>` làm bài thuật toán | Code | `graph/index.ts` | Có | Hết: 0 bài `<module>` trên các repo đo, Capstone BrewLite thành `Create Order` |
| B07 | B-11 + B-28 | Bước thuật toán rỗng, sai số dòng | Code | `graph/nodes.ts` | Có với B-11 | Chưa thử riêng, B-27 đã bỏ bài `Order` gây B-11 |
| B07 | B-29 + B-30 | Tên bước, tên bài khó hiểu | Spec, Code | Spec 11 Mục 13, `graph/naming.ts`, `graph/callgraph.ts` | Có | Chưa thử. Đổi tên là đổi id |
| B07 | B-10 | Cảnh báo thời gian với người học | Cấu hình | `ENGINE_BUDGET_MS` hoặc Vai D | Có | Chưa thử |
| B08 | B-31 | Test không theo repo demo | Spec | Q-03, `__tests__/repo-demo.test.ts` | Có | Cần chốt Q-03 |
| B09 | B-32 | Tải manifest từng file nên hết hạn | Code | `ingest/selective.ts` | Không | Chưa thử |

B10 không có nhóm riêng: B-34 tìm thấy khi chạy B10 nhưng gốc nằm ở nhận route của B05.

---

## Vai B — Engine

### B-01 · Nặng · Bài NestJS hiện code của method khác

- **Hiện tượng:** `Get Order` mở đầu bằng `create`. `Auth Me` Bước 1 lẫn code `register`, `login`. BrewLite bị 11/17 route, repo demo 14/18 bài.
- **Nguyên nhân:** `getStartLineWithDecorators` trong `symbols.ts` quét mọi decorator trong class.
- **Cần sửa:** method chỉ lấy decorator của chính nó.
- **Kiểm tra:** quét repo NestJS chưa từng quét, mở `Get Order`, bước đầu chỉ có `findOne`.
- **Trạng thái:** chờ kiểm. Nhánh `b/fix-nest-buoc-dau-2` lấy commit `1066d4d`, thêm ca comment giữa decorator và method. `npm test` 685 qua. Quét `kuuhakubee/CNPM_BrewLite` và `lujakob/nestjs-realworld-example-app`: bước 1 không còn lẫn method khác, số bài, số cạnh, `id` không đổi. Đã đổi `ENGINE_VERSION` thành `1.7.0`.

### B-02 · Nặng · Capstone lấy từ file test

- **Hiện tượng:** BrewLite có Capstone `Order` từ `order-state-machine.spec.ts`. Repo demo có `user.service.spec.ts` (E06-12).
- **Nguyên nhân:** ING-87 chỉ giảm ưu tiên file test, không loại khỏi node.
- **Cần sửa:** trong `nodes.ts`, còn từ `DISPLAY_MIN_NODES` candidate không mang cờ test thì bỏ candidate mang cờ. `isTestPath` trong `selective.ts` chưa export và `priority.ts` có bản logic riêng, nên gom về một hàm dùng chung rồi mới dùng lại.
- **Kiểm tra:** Capstone BrewLite là `Create Order`, không còn node từ `.spec`.
- **Trạng thái:** chờ kiểm. Nhánh `b/fix-route-file-test`. Đã sửa ENG-110, D-12: thiếu bài sạch thì bù vừa đủ `CONFIG.DISPLAY_MIN_NODES`, không có bài sạch thì giữ nguyên, Capstone ưu tiên bài sạch. Quét `CNPM_BREWLITE_ASSIGNMENT_01`: 17 bài, không còn bài từ `.spec`, Capstone `Create Order`. Đã đổi `ENGINE_VERSION` thành `1.7.0`.

### B-03 · Vừa · `config.get()` thành route giả

- **Hiện tượng:** BrewLite có bài `List Jwt_expires_ins` và `Charge`.
- **Nguyên nhân:** `callgraph.ts` nhận route theo tên `get` và số đối số, không xét đối số cuối có phải handler không.
- **Cần sửa:** làm cả hai điều kiện, vì chỉ xét đối số cuối thì `cache.get('k', loadFn)` vẫn thành route.
  1. Đối số cuối phải là hàm, lời gọi bọc, hoặc tên tham chiếu tới hàm. Chuỗi, số, boolean, object, tên hằng thì không tạo route.
  2. Receiver phải có nguồn từ `express()`, `Router()` theo `12` Mục 1. Code hiện chưa kiểm điều này.
- **Kiểm tra:** BrewLite không còn 2 bài trên và vẫn đủ 17 route thật. Có test `cache.get('k', loadFn)` không sinh route.
- **Trạng thái:** chờ kiểm. Nhánh `b/fix-route-file-test`. Đã kiểm receiver và đối số cuối. Quét `CNPM_BREWLITE_ASSIGNMENT_01`: hết `List Jwt_expires_ins`, `Charge`, còn đủ 17 bài. Có test `cache.get('k', loadFn)`.

### B-04 · Vừa · Quá nhiều bài mở sẵn

- **Hiện tượng:** BrewLite mở 13/20 bài, `nestjs/nest` mở 19/20 ngay từ đầu.
- **Nguyên nhân:** quyết định D-07 chỉ nối bài gọi chung hàm, nên nhiều bài không có bài cha.
- **Cần sửa:** thêm `addTreeEdges` trong `nodes.ts`, nối bài theo module thành cây, cạnh thêm là `INFERRED` và có khóa bài (đề xuất D-73).
- **Kiểm tra:** BrewLite mở lúc đầu không quá 6 bài.
- **Trạng thái:** đã xác nhận trên site, chưa làm. Làm theo B-39, không nối theo module. Đổi cách khóa bài nên cần thử kỹ trước khi demo.

### B-05 · Vừa · Node tách rời, bản đồ quá dài

- **Hiện tượng:** BrewLite có 9 node không nối với bài nào, hàng đầu có 13 bài.
- **Nguyên nhân:** như B-04, cộng quyết định D-55 đưa mọi bài không có cha lên hàng đầu.
- **Cần sửa:** làm cùng B-04, rồi đo lại. Bản đồ chỉ đọc được khi đã sửa thêm lỗi D-01.
- **Kiểm tra:** BrewLite hết node lẻ, còn khoảng 3 cây (theo mô phỏng).
- **Trạng thái:** đã xác nhận trên site, chưa làm. Làm theo B-39.

### B-06 · Vừa · Không có luồng tới tầng dữ liệu

- **Hiện tượng:** BrewLite có 0/20 bài chứa bước `DATA_ACCESS`, dù có 51 lời gọi `this.prisma...`. Repo dùng TypeORM hay Mongoose vẫn có: `nestjs-realworld` 19/20, `node-express-boilerplate` 12/17.
- **Nguyên nhân:** `isDataSinkCall` trong `slicing.ts` xét phần cuối của receiver, với `this.prisma.order.create` là `order`, không khớp mẫu. Nhánh `prisma.` dùng `startsWith` nên `this.prisma...` không khớp. `tx.order.create` trong transaction cũng bị sót. ENG-82 trong spec 11 viết mẫu `prisma.` nên spec cũng thiếu.
- **Hậu quả:** không chỉ thiếu nhãn. ENG-81 và criterion đều dựa vào `DATA_SINK`, nên lát cắt có thể bỏ sót bước và chọn sai dòng trọng tâm.
- **Cần sửa:** bỏ `this.` rồi xét mọi đoạn của receiver có `prisma`, `tx`, `trx`. Không nới regex receiver chung, vì `client` đã khớp cả `httpClient.get`. Ghi rõ luật `prisma.` trong spec 11 Mục 8. Đổi `ENGINE_VERSION`.
- **Kiểm tra:** bước gọi Prisma có nhãn `DATA_ACCESS`, các bài BrewLite có gọi Prisma đều tới tầng dữ liệu.
- **Ảnh hưởng demo:** có.
- **Trạng thái:** chờ kiểm. Nhánh `b/fix-b27-module`. `isDataSinkCall` bỏ `this.` rồi xét mọi đoạn của receiver có `prisma`, `tx`, `trx`. Quét `CNPM_BREWLITE_ASSIGNMENT_01`: 14/17 bài tới `DATA_ACCESS`, đọc bài `Create Order`, `Get Order` đúng luồng. `nestjs-realworld` 19/20, `node-express-boilerplate` 12/14. Đã đổi `ENGINE_VERSION` thành `1.7.0`. **Còn lại:** `node-express-realworld` có 8 bài gọi `prisma.x.y` mà không có bước `DATA_ACCESS`: hàm có `throw new HttpException` từ `http-exception.model.ts`, nên ENG-82 coi là có gọi tầng dữ liệu. Code đúng chữ spec, cần chốt có tính constructor ở file `model` hay không. Chỉ sai nhãn, `entities` của B-39 đọc mọi layer nên không ảnh hưởng.

### B-07 · Nặng · Repo Java, Go, Dart bị báo sai hoặc phân tích sai

- **Hiện tượng:** `huynhthanhnhannnh-pixel/SGU-quan-ly-nha-hang` báo `no_code`, `spring-petclinic` báo `only_manifests`, dù đều có code Java. `gin-gonic/examples` (Go) ra 13 node với ngôn ngữ `JAVASCRIPT`, `flutter/samples` (Dart) ra 2 node với ngôn ngữ `PYTHON`.
- **Nguyên nhân:** spec 11 Mục 1 có 7 ngôn ngữ `RESOLVED` và 9 `STRUCTURAL`, nhưng `LANGUAGE_REGISTRY` chỉ có 4. `.java`, `.go`, `.dart` cũng không nằm trong `KNOWN_NO_GRAMMAR`, nên engine coi như không có code và `ERR_UNSUPPORTED_LANGUAGE` không chạy. Điểm 10 trong README Vai B ghi việc này từ trước nhưng chưa ai chốt.
- **Cần sửa:** tối thiểu, nhận các đuôi spec có nhưng chưa có grammar: repo chủ yếu ngôn ngữ đó thì trả `ERR_UNSUPPORTED_LANGUAGE`, repo trộn thì cảnh báo chỉ phân tích một phần. Muốn hỗ trợ thật thì thêm phiếu B11 cho grammar và resolver. Sửa spec cho khớp phạm vi đã chốt, theo việc S-05.
- **Kiểm tra:** 4 repo trên báo đúng ngôn ngữ, không còn `no_code`, không gọi repo Go là `JAVASCRIPT`.
- **Trạng thái:** đang làm. Nhánh `b/fix-b12-b07-ngon-ngu`: Go, Dart, tầng `STRUCTURAL` đã vào `KNOWN_NO_GRAMMAR`. Chạy thật ngày 06/11: `gin-gonic/examples` vẫn 13 node `JAVASCRIPT`, `flutter/samples` vẫn 2 node `PYTHON`, vì `assertNotEmpty` trong `fingerprint.ts` thoát ngay khi còn file code, trái ING-131. Repo trộn cũng chưa có cảnh báo. Cần Phat107 sửa file này. Hai repo Java chờ B-38.

### B-09 · Nhẹ · Danh sách thư viện lẫn đồ dev

- **Hiện tượng:** Tổng quan có `@types/jest`, `ts-node`, lẫn thư viện frontend.
- **Cần sửa:** chỉ lọc lúc hiển thị ở Tổng quan. Không đổi `fingerprint.tech_stack`, vì `21` Mục từ cấm dùng nó để biết công nghệ nào được nhắc tới.
- **Trạng thái:** đã xác nhận trên site, chưa làm.

### B-10 · Nhẹ · Cảnh báo thời gian với người học

- **Hiện tượng:** hiện "Thời gian phân tích đồ thị (3070ms) vượt mức khuyến nghị (600ms)". Ở máy local, 6 repo đo được 605–2827ms nên cảnh báo gần như luôn hiện.
- **Cần sửa:** xem lại `ENGINE_BUDGET_MS` trên Vercel, hoặc Vai D không hiện cảnh báo này cho người học.
- **Trạng thái:** đã xác nhận trên site, chưa làm.

### B-11 · Nhẹ · Bước trỏ vào dòng rỗng

- **Hiện tượng:** bài `Order` có Bước 3 ở dòng 65, file chỉ có 64 dòng code. AI vẫn viết mô tả cho bước rỗng.
- **Cần sửa:** áp đúng luật "Bỏ bước rỗng" của ENG-91 trong `nodes.ts`.
- **Trạng thái:** chờ kiểm. Nhánh `b/fix-b27-module`. Ca dòng ngoài file đã hết nhờ B-27. Đo 5 repo còn 4 bước `ALGO_TERMINATION` chỉ có `}`, tính là bước rỗng theo ENG-91. `nodes.ts` bỏ bước chỉ có dòng trống, ngoặc đóng rồi đánh số lại. Quét `pallets/click`, `nestjs/nest`, `pallets/flask`, `expressjs/express`, repo này: 0 bước rỗng. Đã đổi `ENGINE_VERSION` thành `1.7.0`.

### B-12 · Nhẹ · Lỗi nạp query bị bỏ qua

- **Hiện tượng:** `catch` trong `loadAll` ở `parser.ts` nuốt lỗi khi nạp file `.scm`. Nếu query hỏng, engine vẫn chạy nhưng có thể mất symbol mà không báo gì. Hiện 4 query đều nạp được.
- **Cần sửa:** ngôn ngữ `RESOLVED` thiếu query thì báo lỗi, thêm test `getQuery` khác `null`.
- **Trạng thái:** chờ kiểm. Nhánh `b/fix-b12-b07-ngon-ngu`: `loadAll` báo lỗi kèm tên ngôn ngữ, có test. Typecheck, lint, 741 test xanh.

### B-13 · Nhẹ · Grammar chưa nạp lúc khởi động

- **Hiện tượng:** spec ghi `initParsers` chạy 1 lần khi server khởi động, code gọi lúc `parseAll`, nên request đầu chậm hơn.
- **Cần sửa:** gọi ở bước khởi động, làm cùng A-04.
- **Trạng thái:** chờ kiểm. Nhánh `a/fix-a02-a04-log-khoi-dong`: `src/instrumentation.ts` gọi `initParsers`, lỗi chỉ log `warn` vì trên Vercel chỉ route ingest có file grammar. Chưa thử trên Vercel.

### B-14 · Vừa · Thăm dò GitHub dễ hết giờ với repo mới

- **Hiện tượng:** trong 7 repo đo lần lượt, cả 7 đều hết giờ ở lần gọi đầu rồi mới thử lại, nên mỗi repo mất thêm khoảng 1,3 giây. `gothinkster/vue-realworld-example-app` hỏng cả 2 lần và báo `ERR_NETWORK_TIMEOUT`, ở lượt đo trước `facebook/react` và `calcom/cal.com` cũng vậy, dù repo bình thường. Gọi lại cùng repo thì chỉ còn 110–210ms.
- **Nguyên nhân:** `PREFLIGHT_TIMEOUT_MS` chỉ 300ms, còn lần gọi đầu tới mỗi repo thường lâu hơn. Việc này xảy ra với từng repo mới trong cùng một tiến trình, nên không chỉ do server khởi động lạnh. Chưa rõ phần chậm nằm ở đâu phía GitHub.
- **Cần sửa:** đo trên Vercel rồi tăng trần, ví dụ 1000–1500ms. Đây là `src/contracts/config.ts`, cần báo Vai A và sửa spec.
- **Kiểm tra:** dán repo chưa dùng lần nào, không phải chờ thử lại và không báo `ERR_NETWORK_TIMEOUT`.
- **Trạng thái:** chờ kiểm. Nhánh `b/fix-b14-ingest`. `probeRepo` gọi `archive/HEAD.zip` trước (trần `PREFLIGHT_TIMEOUT_MS` = 1500), chỉ khi 404 mới gọi trang repo với `PREFLIGHT_PAGE_TIMEOUT_MS`; 301 sang repo khác thì gọi lại 1 lần. `resolveRef` nhận `head_zip` từ probe, không gọi lại HEAD.zip. Đổi `probe.ts`, `refs.ts`, `index.ts`, test `tai.test.ts`, `van-tay.test.ts`. Typecheck sạch, lint 0 lỗi (6 cảnh báo cũ), 744 test qua. Chưa dán repo mới trên mạng thật, chưa đo Vercel (A12 còn ô đo). Đã đổi `ENGINE_VERSION` thành `1.7.0`. `ref_label` là SHA vẫn thuộc B-16.

### B-15 · Nhẹ · Link viết hoa bị từ chối

- **Hiện tượng:** `https://GitHub.com/...` và `HTTPS://github.com/...` báo `ERR_INVALID_GITHUB_URL`, dù trình duyệt mở được.
- **Nguyên nhân:** `url.ts` so chuỗi phân biệt hoa thường. Spec cũng không nói tới trường hợp này.
- **Cần sửa:** chuẩn hóa phần scheme và host về chữ thường, giữ nguyên owner và repo.
- **Trạng thái:** đã chạy thật, chưa làm.

### B-16 · Nhẹ · `ref_label` chứa SHA thay vì tên nhánh

- **Hiện tượng:** thanh trên trang học hiện `5da6ad13f8be8e571a9fc2eb4d9b421adfa53a78 @ 5da6ad1`, tức cùng một mã hai lần. Spec muốn `main @ 5be1c2a`.
- **Nguyên nhân:** ING-32 giả định link chuyển hướng của `archive/HEAD.zip` chứa tên nhánh, nhưng GitHub hiện trả commit SHA. `refs.ts` gán `ref_label = ref` nên SHA đi vào chỗ của tên nhánh.
- **Cần sửa:** trong `resolveRef`, `ref` là SHA 40 ký tự thì đặt `ref_label = null`, giữ nguyên `ref`. Sửa ING-32 theo. Muốn hiện tên nhánh thật thì phải lấy thêm từ nguồn khác.
- **Kiểm tra:** nạp BrewLite, thanh trên chỉ còn `@ 5da6ad1`.
- **Trạng thái:** đã thấy trên site, chưa làm. Làm cùng D-14.

### B-17 · Vừa · Monorepo chọn nhầm gói nhỏ rồi báo lỗi

- **Hiện tượng:** `t3-oss/create-t3-turbo` báo `ERR_NO_ARCHITECTURAL_SLICE`. Repo có 76 file code nhưng engine chỉ phân tích `packages/api/` với 6 file. Chọn tay `apps/nextjs/` thì ra 7 node. Zip thử có `web/` lớn gấp 50 lần `api/` vẫn chọn `api/`.
- **Nguyên nhân:** ING-80 trường hợp (a) có client và server thì luôn chọn server, không xét server lớn bao nhiêu và không có đường lùi khi scope không dựng được bài.
- **Cần sửa:** khi scope tự chọn gây `ERR_NO_ARCHITECTURAL_SLICE`, thử ứng viên kế tiếp rồi tới toàn repo. Cần thêm client vào ứng viên và sửa spec.
- **Kiểm tra:** `create-t3-turbo` ra được bản đồ, BrewLite vẫn chọn `backend/`.
- **Trạng thái:** chờ kiểm. Nhánh `b/fix-b17-monorepo`. `detectScope` trả `candidates` gồm cả client (server rồi client, `bytes` giảm dần). `ingest/rescope.ts` có `getScopeFallbacks` và `rescopeIngest` (dựng lại vân tay từ code đã tải, không tải lại zip). `runEngine` ở `engine/index.ts` (đã được đồng ý sửa) bắt `ERR_NO_ARCHITECTURAL_SLICE` khi scope tự chọn, thử lần lượt ứng viên rồi `""`, hết thì giữ lỗi đầu; scope tường minh và lỗi khác không lùi. Test: `rescope.test.ts`, `__tests__/scope-lui.test.ts` (dùng mock `buildGraph`). Chạy thật `t3-oss/create-t3-turbo`: ra bản đồ 3 bài, offset `packages/ui/` (trước: `ERR_NO_ARCHITECTURAL_SLICE`). BrewLite vẫn chọn server (`apps/api/`, 13 bài). Hạn chế: tập file đã nạp giữ nguyên theo scope đầu; offset lùi tới `packages/ui/` cho ít bài, chưa chọn được `apps/nextjs` vì tên không thuộc danh sách client. Typecheck sạch, lint 0 lỗi, test xanh.

### B-18 · Nhẹ · Chống zip bomb chưa dừng giải nén thật

- **Hiện tượng:** zip 0,5 MB khai `size` 10 KB nhưng bung ra 512 MB làm `inflateSelected` chạy 2,8 giây, `listEntriesStreaming` chạy 2,4 giây. File vẫn bị loại đúng, nhưng server bị chiếm suốt thời gian đó. Nếu tăng theo tỉ lệ, upload 4,5 MB có thể chiếm khoảng 25 giây (ước tính).
- **Nguyên nhân:** `extractFromLocalOffset` chỉ bật cờ `exceeded`, dữ liệu vẫn đẩy vào `Inflate` trong một lần gọi đồng bộ nên không dừng được. Timer `STREAM_TIMEOUT_MS` cũng không chạy được giữa chừng. `listEntriesStreaming` bỏ qua `signal`. Manifest còn không qua kiểm tỉ lệ nén của ING-88.
- **Cần sửa:** đẩy dữ liệu nén theo từng phần nhỏ, vượt trần thì dừng ngay. Streaming đặt trần tổng và kiểm `signal`. Manifest qua cùng lớp kiểm.
- **Kiểm tra:** test đo thời gian: zip trên dừng dưới 100ms.
- **Trạng thái:** đã chạy thật với 512 MB, chưa làm.

### B-19 · Nhẹ · Zip nén trên macOS không cắt được thư mục gốc

- **Hiện tượng:** zip có `proj/...` và `__MACOSX/...` giữ nguyên tiền tố `proj/`, nên `backend/`, `frontend/` không được nhận và không phát hiện monorepo.
- **Nguyên nhân:** `findCommonPrefix` xét cả `__MACOSX/`. ING-71 cũng không có thư mục này.
- **Cần sửa:** bỏ `__MACOSX/` và file `._*` trước khi tìm tiền tố chung, sửa ING-60 và ING-71.
- **Trạng thái:** đã chạy với zip dựng thử, chưa làm.

### B-20 · Vừa · Thư mục `integration/` không bị coi là test

- **Hiện tượng:** `nestjs/nest` có 12/20 node lấy từ `integration/`, là code kiểm thử của repo. Trong 100 file giữ lại, `packages/common` chỉ còn 7 file.
- **Nguyên nhân:** danh sách ING-87 không có `integration`, `sample`, `samples`. Các file bằng điểm được xếp theo tên nên `integration/` lấy chỗ trước `packages/`.
- **Cần sửa:** thêm các segment này vào ING-87 và `priority.ts`, làm cùng B-02 vì dùng chung cờ test.
- **Kiểm tra:** `nestjs/nest` không còn node từ `integration/`.
- **Trạng thái:** chờ kiểm. Nhánh `b/fix-route-file-test`. Một hàm `isTestPath` ở `priority.ts`. Đã sửa ING-87: `integration`, `sample`, `samples` chỉ tính ở segment đầu đường dẫn, để không bỏ nhầm `src/integration/`. Quét `nestjs/nest` qua zip: bài có cờ 12 → 0.

### B-21 · Nhẹ · Nhập thư mục sai hoa thường bị báo không có code

- **Hiện tượng:** repo có `Backend/`, nhập `backend` ở "Đổi thư mục" nhận `ERR_NO_SOURCE_FILES_FOUND`.
- **Nguyên nhân:** `detectScope` so `startsWith` phân biệt hoa thường, trong khi phần tự dò thì không.
- **Cần sửa:** so không phân biệt hoa thường rồi dùng đúng tên thư mục thật.
- **Trạng thái:** đã chạy với zip dựng thử, chưa làm.

### B-22 · Vừa · Che secret bỏ sót nhiều mẫu phổ biến

- **Hiện tượng:** chạy 14 mẫu secret thì 10 mẫu không được che. Lọt: `SECRET_KEY` của Django, `app.secret_key` của Flask, `JWT_SECRET_KEY`, `{"password": "..."}`, `{'apiKey': '...'}`, `DB_PASSWORD_PROD`, Stripe `sk_live_`, Slack `xoxb-`, `https://user:pass@host`, private key viết trong một chuỗi. Repo thật `gothinkster/django-realworld-example-app` giữ nguyên `SECRET_KEY` 65 ký tự trong `conduit/settings.py`.
- **Nguyên nhân:** mẫu ING-110 yêu cầu từ khóa đứng ngay trước `=` hoặc `:`, nên `SECRET_KEY` và khóa có dấu nháy không khớp. Danh sách token cũng thiếu Stripe, Slack và URL `https`. Lỗ hổng nằm ở cả spec, không riêng code.
- **Hậu quả:** phần code này được hiện trên giao diện và có thể gửi cho Gemini, nguy hiểm nhất với zip upload của repo riêng tư.
- **Cần sửa:** mở rộng ING-110 và `secrets.ts`: tên khóa có hậu tố (`SECRET_KEY`, `*_PASSWORD_*`), khóa có nháy, thêm các dạng token trên. Đổi `ENGINE_VERSION` vì code đã lưu trong cache vẫn chưa được che.
- **Cần sửa thêm:** `RESET_PASSWORD: 'resetPassword'` đang bị che dù chỉ là hằng, chuỗi hex `'0...'` bị coi là số điện thoại. "Khóa bí mật đã che" ở `CockpitHeader.tsx` đếm cả email: `miguelgrinberg/microblog` báo 9 nhưng cả 9 đều là email.
- **Kiểm tra:** thêm các mẫu trên vào test, repo Django trên không còn `SECRET_KEY` thật.
- **Trạng thái:** chờ kiểm. Nhánh `b/fix-b22-secrets`. `secrets.ts` che thêm: `SECRET_KEY`, `app.secret_key`, `JWT_SECRET_KEY`, `"password":`, `'apiKey':`, `DB_PASSWORD_PROD`, Stripe, Slack, URL `https` có `user:pass`, private key viết trong một dòng. Có test cho từng mẫu. Typecheck sạch, lint 0 lỗi, 758 test qua. Đã quét repo thật `gothinkster/django-realworld-example-app` (ngày 06/11): `SECRET_KEY` trong `conduit/settings.py` giờ thành `<REDACTED_SECRET>`, chỉ 1 chỗ bị che, không che nhầm chỗ khác. Repo này chỉ có mẫu `SECRET_KEY`, các mẫu còn lại mới có test, chưa thử repo thật. Chưa làm: `RESET_PASSWORD: 'resetPassword'` vẫn bị che (spec chưa có luật loại hằng), chuỗi hex bị coi là số điện thoại (ở `maskSensitive`), đếm email ở `CockpitHeader.tsx` (file Vai D). Đã đổi `ENGINE_VERSION` thành `1.7.0`.

### B-23 · Nhẹ · Đọc thiếu gói trong Pipfile, Cargo.toml, pubspec.yaml

- **Hiện tượng:** Pipfile chỉ có `[packages]` cho danh sách rỗng. Pipfile có `pytz` trước `fastapi` cũng rỗng, nên không nhận ra framework. `Cargo.toml` và `pubspec.yaml` có mục gói nằm cuối file cũng rỗng.
- **Nguyên nhân:** `fingerprint.ts` dùng `\z` trong regex. JavaScript không có `\z`, ký hiệu này khớp chữ `z` thường, nên regex không nhận ra cuối file và dừng ở chữ `z` đầu tiên.
- **Cần sửa:** đổi `\z` thành `$(?![\s\S])` như nhánh poetry, thêm test.
- **Trạng thái:** đã chạy thật, chưa làm.

### B-24 · Nhẹ · Repo Vue JavaScript bị báo TypeScript

- **Hiện tượng:** `gothinkster/vue-realworld-example-app` có 19 file `.vue` đều là JavaScript, nhưng `primary_language` là `TYPESCRIPT`.
- **Nguyên nhân:** `buildFingerprint` cộng mọi `.vue`, `.svelte` vào `TYPESCRIPT`, không dùng ngôn ngữ ING-101 đã tìm được.
- **Cần sửa:** tính phần `.vue`, `.svelte` theo `file_language` sau khi trích xuất. File không được giữ thì mới dùng giá trị mặc định.
- **Trạng thái:** đã chạy thật, chưa làm.

### B-25 · Nhẹ · Báo nhầm tsconfig hợp lệ là hỏng

- **Hiện tượng:** `nestjs/nest` có 30 cảnh báo, gần hết là "Tệp cấu hình .../tsconfig.json bị hỏng định dạng". Các file đó vẫn dùng được.
- **Nguyên nhân:** `cleanJson` xóa comment bằng regex mà không phân biệt chuỗi, nên `"https://..."`, `"@/*"` và `"src/**/*"` bị coi là comment. tsconfig được phép có dấu phẩy thừa, nên hàm này chạy và làm hỏng file.
- **Cần sửa:** bỏ comment có xét chuỗi, hoặc dùng parser JSONC. `tsconfig.json` chỉ dùng cho alias, không nên hiện cảnh báo cho người học.
- **Trạng thái:** chờ kiểm. Nhánh `b/fix-b25-b26-tsconfig`. Thêm `src/server/engine/jsonc.ts` (bỏ comment có xét chuỗi, bỏ dấu phẩy thừa), `fingerprint.ts` dùng chung. tsconfig/jsconfig hỏng không còn cảnh báo cho người học, `package.json` hỏng vẫn cảnh báo. Quét thật `nestjs/nest`: 0 cảnh báo tsconfig (trước 30). Test trong `graph/__tests__/tsconfig.test.ts`. Typecheck sạch, lint 0 lỗi, 770 test qua.

### B-26 · Vừa · Không đọc được alias `@/` nên mất cạnh gọi hàm

- **Hiện tượng:** mọi import `@/...` bị coi là thư viện ngoài: BrewLite 147/147, `shadcn-ui/taxonomy` 274/274, `fastapi/full-stack-fastapi-template` 248/248. Khi chọn `frontend/` của BrewLite, 7/8 bài không có cạnh gọi nào. `taxonomy` có 222 hàm nhưng chỉ 15 cạnh, 14/20 bài không có cạnh.
- **Nguyên nhân:** có 2 chỗ trong `parseTsConfig` ở `resolvers/ts_js.ts`. (1) Chỉ đọc `tsconfig.json` ở gốc repo, nên `frontend/tsconfig.json` bị bỏ qua. (2) Xóa comment không phân biệt chuỗi: `"@/*"` và `"**/*.ts"` bị coi là comment, nên tsconfig mặc định của Next.js parse lỗi. `catch` nuốt lỗi nên không có cảnh báo.
- **Cần sửa:** tìm tsconfig gần file đang xét nhất và tính `paths` theo thư mục đó. Dùng chung parser JSONC với B-25.
- **Kiểm tra:** 3 repo trên không còn `@/...` trong external, `frontend/` của BrewLite có cạnh gọi.
- **Ảnh hưởng demo:** không ảnh hưởng `backend/` của BrewLite. Có ảnh hưởng khi đổi sang `frontend/`.
- **Trạng thái:** chờ kiểm. Nhánh `b/fix-b25-b26-tsconfig`. `ts_js.ts` đọc mọi tsconfig/jsconfig trong manifests (parser JSONC chung với B-25), mỗi file dùng tsconfig gần nhất, `baseUrl` tính từ thư mục chứa tsconfig, và mẫu `@/*` giữ dấu `/` nên không nuốt `@nestjs/core`. Quét thật (import `@/...` còn tính là gói ngoài): `CNPM_BrewLite` 147 → 0 (cạnh gọi 72), `shadcn-ui/taxonomy` 274 → 43, `full-stack-fastapi-template/frontend` 248 → 30, `nestjs/nest` 0. Phần còn lại ở `taxonomy` và `fastapi` nghi do trần số file (`truncated`, quota loại 26 và 49 file), chưa chứng minh. Chưa kiểm trực tiếp cạnh gọi khi chọn `frontend/` của BrewLite vì repo đã đổi cấu trúc thành `apps/web`. Đã đổi `ENGINE_VERSION` thành `1.7.0`.

### B-27 · Vừa · Bài học lấy cả `<module>` làm thuật toán

- **Hiện tượng:** BrewLite có bài `Order` với 3 bước đều là `<module>` của file test. `node-express-realworld` có bài `:slug / Article` với `<module>` của `article.controller.ts`, đoạn bỏ qua tới 214 dòng. Cả 2 repo này và `node-express-boilerplate` đều có Capstone là node `<module>`. `pallets/click` có nhiều bài `<module>` tương tự.
- **Nguyên nhân:** code cấp cao nhất được coi là hàm `<module>`, gồm cả các handler ẩn danh, nên độ phức tạp cộng dồn rất cao. `pickVipFunctions` không loại nó nên thành bài `ALGORITHMIC_CORE`.
- **Cần sửa:** loại `<module>` khỏi chọn VIP và ENG-90, trừ chế độ `PROCEDURAL`. Liên quan B-02 và B-11: B-02 chỉ bỏ được file test, không bỏ được trường hợp này.
- **Kiểm tra:** không còn node `ALGORITHMIC_CORE` có `function_name` là `<module>`.
- **Ảnh hưởng demo:** có.
- **Trạng thái:** chờ kiểm. Nhánh `b/fix-b27-module`. `graph/index.ts` loại `<module>` khỏi ứng viên ENG-90 (a), (b), PROCEDURAL đi nhánh riêng nên không đổi. Test `ENG-90: <module>` đỏ trước khi sửa. Quét 7 repo (BrewLite, `nestjs/nest`, `bulletproof-react`, `node-express-realworld`, `node-express-boilerplate`, `pallets/click`, repo này): 0 node `ALGORITHMIC_CORE` có `function_name` là `<module>`. Capstone `realworld` là `Update Article`, `nestjs/nest` là `Create Redactor`. Đã đổi `ENGINE_VERSION` thành `1.7.0`.

### B-28 · Nhẹ · Dòng "bỏ qua" của bài thuật toán có số dòng thật

- **Hiện tượng:** dòng `// … (24 dòng)` có `snippet_line_map` khác 0, đo được 8 dòng trên 6 repo. Spec yêu cầu marker có map bằng 0.
- **Nguyên nhân:** phần cắt bước trong `nodes.ts` (quanh dòng 288) chèn marker rồi chỉ cắt mảng map, không dựng lại. Các dòng sau marker cũng có thể lệch số.
- **Cần sửa:** dựng lại `snippet_line_map` khi chèn marker.
- **Trạng thái:** chờ kiểm. Nhánh `b/fix-b27-module`. `nodes.ts` dựng lại `snippet_line_map`, marker có map 0, thụt lề theo dòng bị bỏ đầu, `line_end` theo map. Quét 5 repo trên: marker sai 47 → 0, `line_start`, `line_end` lệch map 47 → 0. Đã đổi `ENGINE_VERSION` thành `1.7.0`.

### B-29 · Nhẹ · Route dạng `.route()` hiện tên nhiều dòng

- **Hiện tượng:** với `router.route('/:userId').get(...).delete(...)`, tên bước là cả chuỗi lệnh nhiều dòng, kết thúc bằng `.delete('')` và mất path. Tên bài cũng sai theo: `GET /` của router users thành `Get User`, kèm `Get User #2`.
- **Nguyên nhân:** `callgraph.ts` lấy nguyên text receiver làm `display_name`.
- **Cần sửa:** dựng tên gọn như `router.delete('/:userId')`.
- **Kiểm tra:** chạy `hagopj13/node-express-boilerplate`, tên bước nằm trên 1 dòng và có path.
- **Trạng thái:** đã chạy thật, chưa làm.

### B-30 · Vừa · Tên bài tự sinh khó hiểu hoặc sai nghĩa

- **Hiện tượng:** BrewLite có `List Healths` (`GET /health`), `Create Order Cancel` (`POST /orders/:id/cancel`). `nestjs-realworld` có `Article Comments` cho `DELETE .../comments/:id`, mất động từ. `microblog` có `List Logins`, `List Searchs`, `List Reset_password_requests`. `node-express-boilerplate` có `Create Forgot-password`.
- **Nguyên nhân:** spec 11 Mục 13 ghép tên máy móc: `GET` một đoạn luôn là `List Xs`, `POST` luôn là `Create`, hai đoạn cuối thì bỏ động từ. Đoạn path chưa được tách `-`, `_` và số nhiều chỉ thêm `s`.
- **Cần sửa:** sửa luật Bậc 1 và `naming.ts`: đoạn cuối là hành động (`cancel`, `login`, `search`, `health`) thì dùng thẳng, ví dụ `Cancel Order`. Giữ động từ cho `DELETE`, tách `-`, `_`.
- **Lưu ý:** id node có `slug(base_title)`, đổi tên là đổi id. Phải đổi `ENGINE_VERSION`, và tiến độ của phiên cũ không dùng lại được.
- **Kiểm tra:** cập nhật bảng T-ENG-22, tên 6 repo trên đọc được thành câu.
- **Ảnh hưởng demo:** có.
- **Trạng thái:** đã chạy thật, chưa làm.

### B-31 · Vừa · Test và bản offline không theo repo demo thật

- **Hiện tượng:** 161 test engine đều xanh trong khi BrewLite có B-01, B-02, B-06. `repo-demo.test.ts` và `public/demo/mock_bundle.json` đều dùng `shop-api` tự viết (Express, TypeORM), không có test nào dùng Prisma. Công cụ `engine-that.mjs` đã đo được `toi_data = 0` ở BrewLite và `nestjs/nest`, nhưng phiếu B08 chỉ yêu cầu đếm, không đặt ngưỡng.
- **Nguyên nhân:** Q-03 trong `00_QUYET_DINH.md` chưa chốt repo demo, nên tiêu chí vẫn bám `shop-api`.
- **Cần sửa:** chốt Q-03. Nếu là BrewLite thì thêm repo mẫu NestJS và Prisma trong `repo-demo.test.ts`, thêm ngưỡng `cnpm_brewlite:toi_data` vào lệnh kiểm, và thu lại bản offline nếu demo cần.
- **Ảnh hưởng demo:** có, vì lỗi của repo demo không được test chặn.
- **Trạng thái:** đã kiểm, cần nhóm chốt Q-03.

### B-32 · Vừa · Monorepo lớn hết hạn tải chọn lọc vì tải manifest từng file

- **Hiện tượng:** `vercel/next.js` và `calcom/cal.com` hết hạn 15 giây rồi lùi về zip bị cắt. `next.js` mất 22 giây, chỉ tải được 37 file nhỏ, cuối cùng phân tích `bench/` và `apps/bundle-analyzer/`. Cảnh báo còn mâu thuẫn: báo đang phân tích `packages/next/`, trong khi kết quả thực tế là toàn repo.
- **Nguyên nhân:** `selective.ts` tải manifest bằng vòng `for` có `await`, mỗi file khoảng 0,4 giây, chỉ phần code mới chạy song song. Repo nhiều manifest dùng hết hạn trước khi tới code. Khi lùi, cảnh báo ING-47 không được xóa.
- **Cần sửa:** tải manifest song song theo `SELECTIVE_FETCH_CONCURRENCY`, chỉ tải manifest trong scope và ở gốc. Xóa cảnh báo phạm vi khi lùi.
- **Kiểm tra:** `vercel/next.js` có `selective_fetch = true`.
- **Ảnh hưởng demo:** không, BrewLite không cần tải chọn lọc.
- **Trạng thái:** đã chạy thật ở chế độ ẩn danh, chưa làm.

### B-33 · Vừa · Engine rất chậm khi có nhiều route

- **Hiện tượng:** `django/django` có hơn 300 luồng, `buildGraph` mất khoảng 2 phút, trong đó `buildSlice` chiếm khoảng 93 giây. BrewLite chỉ mất 0,6–2,8 giây.
- **Nguyên nhân:** `buildSlice` duyệt lại toàn bộ dữ liệu cho từng entry. Nghi chỗ nặng nhất là `Array.from(ctx.idx.functions.values()).some(...)` ở dòng 677, nằm trong vòng xử lý từng dòng. Chưa đo riêng dòng này. Toàn bộ chạy đồng bộ, không ngắt giữa chừng được.
- **Cần sửa:** lập chỉ mục hàm theo file và cạnh theo caller một lần, rồi dùng lại cho mọi entry.
- **Kiểm tra:** `django/django` dưới 10 giây, kết quả đồ thị không đổi.
- **Ảnh hưởng demo:** không, chỉ gặp với repo rất lớn.
- **Trạng thái:** đã đo bằng CPU profile, chưa làm.

### B-34 · Vừa · Mock API bị nhận là route Express

- **Hiện tượng:** `alan2207/bulletproof-react` là app React nhưng bị báo `WEB_BACKEND`, framework Express. Cả 20 bài lấy từ mock `http.get(...)` của thư viện `msw`, tên bài là `<anon@l111>`, không có bài nào từ giao diện thật.
- **Nguyên nhân:** spec 12 Mục 1 yêu cầu `R` phải đến từ `express()`, `Router()` hoặc `fastify()`, nhưng `callgraph.ts` chỉ xét tên method. Luật handler không chặn được ca này vì đối số cuối đúng là hàm. Framework Express đến từ `express` trong `devDependencies` (liên quan B-09). URL dạng template làm path rỗng, nên tên bài rơi về `<anon@l111>`.
- **Cần sửa:** kiểm nguồn gốc của `R`, làm cùng B-03. Bỏ file mock theo ING-87 (`mocks`, `__mocks__`), và không cho tên bài chứa `<`, `>`.
- **Kiểm tra:** repo trên không còn route từ `msw`.
- **Ảnh hưởng demo:** không có với BrewLite.
- **Trạng thái:** đang làm. Nhánh `b/fix-route-file-test` đã xong nhận route và cờ `mocks`: `bulletproof-react` từ 13 bài mock về 0. Còn 2 phần ở Luồng 2: repo vẫn báo framework Express, và `fastify-example-todo` còn 6 tên bài có `<`, `>`.

---

## Vai D — Giao diện

### D-01 · Vừa · Bản đồ quá nhỏ

- **Hiện tượng:** bản đồ mở ở zoom 0,20–0,32, chữ gần như không đọc được, card hai đầu hàng bị cắt.
- **Cần sửa:** `DagCanvas.tsx` bỏ `fitView` lúc mở, căn vào bài đang học ở zoom khoảng 1. Nút xem toàn cảnh đã có. Sửa T32 trong `30_UI.md`.
- **Kiểm tra:** mở đồ thị 20 node, đọc được tiêu đề, kéo xem hết được.
- **Trạng thái:** đã xác nhận trên site, chưa làm.

### D-03 · Nhẹ · Nhãn "Luồng chính" gây hiểu sai

- **Cần sửa:** đổi thành "Lộ trình học chính" trong `RepoOverviewModal.tsx`, vì đây là chuỗi bài dài nhất, không phải luồng chạy của ứng dụng.
- **Trạng thái:** chưa làm.

### D-04 · Nhẹ · Thông báo lỗi repo thiếu hướng dẫn

- **Hiện tượng:** E06-06, E06-07 ghi thiếu đoạn hướng dẫn `.zip` và `{details.hint}` theo `30_UI`.
- **Cần sửa:** bổ sung trong `src/lib/messages.ts`. `details.hint` là mã máy (`submodule`, `only_unsupported`, `only_manifests`, `no_code`, `empty_subdir`), nên phải đổi sang câu tiếng Việt theo bảng mới ở việc S-06, không in thẳng.
- **Trạng thái:** chưa làm.

### D-05 · Nặng · Cửa sổ tràn khỏi màn hình

- **Hiện tượng:** Tổng quan và kết quả chấm bài bị cắt đầu và cuối, không cuộn được, không thấy đủ tiêu đề và nút.
- **Nguyên nhân:** `Dialog.tsx` không giới hạn chiều cao, ẩn phần dư, trang sau bị khóa cuộn.
- **Cần sửa:** thêm `max-h-[calc(100vh-2rem)]`, `flex flex-col`; thân cửa sổ `overflow-y-auto`; tiêu đề và nút luôn hiện. Cửa sổ kết quả cần tách nút thành chân cửa sổ.
- **Kiểm tra:** ở màn 1366×768, mở 2 cửa sổ trên, thấy đủ tiêu đề và nút, nội dung cuộn được.
- **Trạng thái:** đã xác nhận trên site, chưa làm.

### D-06 · Nhẹ · Tên tầng khó hiểu

- **Hiện tượng:** Tổng quan hiện `ENTRY_POINT`, `BUSINESS_LOGIC`.
- **Cần sửa:** đổi sang tên tiếng Việt dễ hiểu trong `RepoOverviewModal.tsx`.
- **Trạng thái:** đã xác nhận trên site, chưa làm.

### D-07 · Nặng · Không bấm được node trên đồ thị

- **Hiện tượng:** bấm node "Sẵn sàng" không vào bài, phải đi qua Lộ trình học tập. Nút "Thử lại" trong card cũng bị ảnh hưởng.
- **Nguyên nhân:** `DagCanvas.tsx` tắt kéo và chọn, không có `onNodeClick`, nên ReactFlow đặt `pointerEvents: none` cho node.
- **Cần sửa:** thêm `onNodeClick`, hoặc `pointer-events-auto` cho card. Ở `LessonGraphDrawer.tsx` dòng 273, chọn bài xong phải gọi `onClose()`.
- **Kiểm tra:** bấm node vào được bài và ngăn kéo đóng lại; bài bị khóa không vào được; nút "Thử lại" chạy.
- **Trạng thái:** đã xác nhận trên site, chưa làm.

### D-08 · Nhẹ · Hiện nguyên dấu backtick

- **Hiện tượng:** câu hỏi, nhận xét, gợi ý hiện cả dấu backtick quanh tên code.
- **Cần sửa:** hiển thị đoạn trong dấu backtick dạng code.
- **Trạng thái:** đã xác nhận trên site, chưa làm.

### D-09 · Vừa · Tiến độ gây hiểu nhầm

- **Hiện tượng:** học xong mà chưa đạt thì Lộ trình hiện 0/20, 0%, kèm "1 bài cần ôn". Người học tưởng không lưu.
- **Nguyên nhân:** "Hoàn thành" chỉ đếm bài đạt. Chữ "cần ôn" sai vì quyết định D-35 đã bỏ ôn tập.
- **Cần sửa:** đổi thành "1 bài chưa đạt", hiện rõ số bài đã học ở `src/app/page.tsx` và `src/app/roadmap/page.tsx`. Xem thêm Q-A.
- **Trạng thái:** đã xác nhận trên site, chưa làm.

### D-10 · Nhẹ · Hai thẻ repo giống hệt nhau

- **Hiện tượng:** Lộ trình có 2 thẻ BrewLite, không phân biệt được.
- **Cần sửa:** hiện commit hoặc ngày tạo, hoặc gom phiên cùng repo. Có thể 2 thẻ là phiên cũ và phiên học lại.
- **Trạng thái:** cần xác minh.

### D-11 · Vừa · Giữ dữ liệu phiên cũ khi chuyển trang

- **Hiện tượng:** mở phiên khác vẫn thấy bài cũ một lúc, có thể bấm nhầm.
- **Nguyên nhân:** store không bị xóa khi chuyển trang, trang học không có màn chờ.
- **Cần sửa:** `src/app/learn/page.tsx`: store khác `sessionId` thì gọi `resetSession()` trước khi tải, đang tải thì hiện màn chờ.
- **Kiểm tra:** mở phiên A, về Lộ trình học tập, mở phiên B, không thấy bài của A.
- **Trạng thái:** đã xác nhận khi test, chưa làm.

### D-12 · Vừa · Lộ đáp án khi đang trả lời

- **Hiện tượng:** Luồng thực thi hiện cùng màn hình với ô trả lời, người học chép lại được.
- **Nguyên nhân:** giao diện thật không có tab như spec, và spec cũng chưa có luật ẩn giải thích khi đang trả lời. Tách tab thôi thì người học vẫn quay lại xem được.
- **Cần sửa:** thu gọn hoặc ẩn phần giải thích khi đang trả lời, nộp xong mới mở lại. Vẫn giữ phần code để người học đọc khi trả lời. Thêm luật vào spec theo việc S-06.
- **Trạng thái:** đã xác nhận trên site, chưa làm.

### D-13 · Nhẹ · Cảnh báo "giống 100%" đáng ngờ

- **Hiện tượng:** ảnh test có 2 câu trả lời dài 84 và 129 ký tự đều báo 100%.
- **Cần sửa:** nộp sai một lần, sửa hẳn câu trả lời, xem % có giảm không. Code tính có vẻ đúng.
- **Trạng thái:** cần xác minh.

### D-14 · Vừa · Thanh trên trang học lộn xộn

- **Hiện tượng:** mã SHA dài chiếm chỗ, đường dẫn file bị cắt còn `/ frontend / s`, lộ thanh cuộn trắng giữa nền cam, các nút rớt xuống hàng 2 và dạt sang trái.
- **Nguyên nhân:** `CockpitHeader.tsx` xếp tên repo, nút, đường dẫn, huy hiệu và chỉ số vào một hàng `flex-wrap`. Nhóm bên phải và huy hiệu đều `shrink-0`, nên đường dẫn bị ép. Lớp `no-scrollbar` chưa được định nghĩa trong CSS nên thanh cuộn vẫn hiện. Mã SHA dài là do B-16.
- **Cần sửa:** chia cố định 2 hàng: hàng 1 là nút quay lại, tên repo, mã 7 ký tự và đường dẫn rút gọn (xem đủ khi rê chuột); hàng 2 là huy hiệu và nút. Bỏ thanh cuộn, dùng chung một kiểu nút.
- **Kiểm tra:** ở màn 1366px và 1920px, không thấy thanh cuộn, tên file đọc được, nút không dạt lệch.
- **Trạng thái:** đã xác nhận khi test, chưa làm.

### D-15 · Vừa · Bấm "Gửi báo sai" không có phản hồi

- **Hiện tượng:** nhập lý do rồi bấm "Gửi báo sai" mà không thấy gì thay đổi.
- **Nguyên nhân:** `handleReportWrongSubmit` trong `src/app/learn/page.tsx` lấy `store.runs[nodeId]`, thiếu thì `return` im lặng. Node đã xong mở lại sau khi tải trang chỉ có `progress.nodes[id].last_run`, vì `loadRun` không nạp run đã xong. Nút vẫn hiện do câu hỏi lấy từ `last_run`, nên bấm xong không gửi request, không báo lỗi, cửa sổ không đóng.
- **Cần sửa:** lấy `run_id` từ `runs[nodeId]`, thiếu thì lấy `last_run.run_id`. Sau khi gửi xong, `applyQuestionState` và `evalKey` cũng phải chạy được với `last_run`, để hiện 🚩 và điểm hoàn lại. Không tìm được run thì báo lỗi, không im lặng.
- **Cần sửa thêm:** cửa sổ hứa "hoàn lại ngay lập tức", nhưng theo BKT-63 chỉ hoàn khi điểm kỹ năng chưa bị câu khác cập nhật. Đổi lời, và báo rõ khi `skill_change = null`. Bỏ "(D-22)" và "BKT" khỏi chữ người học đọc, xóa ô lý do sau khi gửi.
- **Kiểm tra:** tải lại trang, mở node `FAILED`, gửi báo sai: tab Network có `POST /api/report-wrong`, thấy toast, cửa sổ đóng, câu có 🚩. Báo sai hết câu `FAILED` thì node thành `COMPLETED`.
- **Trạng thái:** đã xác nhận hiện tượng khi test, nguyên nhân đọc từ code, chưa chạy lại để chứng minh.

---

## Vai C — AI

### C-01 · Vừa · Gemini lỗi không để lại log

- **Hiện tượng:** mọi loại lỗi Gemini đều hiện "Chưa phân tích được", nên lỗi `thinkingBudget` rất khó tìm.
- **Cần sửa:** ghi mã lỗi trong `catch` của `callLLMOnce` ở `gemini.ts`, không ghi khóa hay nội dung nhạy cảm. Luật log đã có trong quyết định D-74 (`20` AI-12).
- **Trạng thái:** chờ kiểm. `callLLMOnce` ghi 1 dòng log `warn` (`event: "llm_error"`, loại lời gọi, `kind`, `status`, `retry_after_ms`, lý do ngắn) cho mọi lần lỗi, không ghi khóa và prompt. Test AI-12 (C-01) xanh; `typecheck`, `lint`, `npm test` xanh.

### C-02 · Vừa · Giới hạn token có thể quá thấp

- **Hiện tượng:** `ANALYZE` chỉ có 900 token đầu ra, tiếng Việt có thể bị cắt.
- **Cần sửa:** phân tích hết repo demo trên AI thật, đếm bài lỗi rồi chỉnh `LLM_MAX_OUTPUT_TOKENS` nếu cần.
- **Trạng thái:** cần đo trên AI thật.

### C-03 · Vừa · Câu hỏi gắn sai dòng code

- **Hiện tượng:** bài `Order` nói `Object.keys` dòng 10 kết hợp `canTransition` dòng 21 "thay vì viết thủ công". Thực tế dòng 21–25 chính là ca viết tay, biến `ALL` chỉ dùng ở dòng 44 và 49. Đáp án tham khảo cũng sai theo.
- **Cần sửa:** sửa prompt và thêm ca này vào `review/loi_da_gap.md`, rồi kiểm bằng duyệt tay. Không viết kiểm tra bằng code cho lỗi này, vì cổng gác không kiểm được nghĩa đúng sai (GUARD-21).
- **Trạng thái:** đã xác nhận trên site, chưa làm.

### C-04 · Vừa · Câu hỏi chỉ lặp lại phần giải thích

- **Hiện tượng:** Câu 1 bài `Auth Me` trả lời được bằng cách chép Luồng thực thi.
- **Cần sửa:** yêu cầu prompt hỏi suy luận thay vì nhắc lại. Spec 21 ghi code không kiểm lỗi này, phải duyệt tay.
- **Trạng thái:** đã xác nhận trên site, chưa làm.

### C-05 · Vừa · Tổng quan AI không ra sau khi phân tích hết bài

- **Hiện tượng:** lần đo bằng `scripts/agent-probe.ts` ngày 05/11/2026 (12 bài, key miễn phí), `analyze-overview` thất bại cả 2 request, 0 token, không bị cổng gác chặn. Gọi lại cùng đầu vào sau đó thì thành công.
- **Nguyên nhân:** gọi ngay sau loạt `analyze-node` nên gặp 429/503. `retryDelay` trong `gemini.ts` chỉ chờ `CONFIG.LLM_RETRY_DELAY_MS` cộng ngẫu nhiên, trong khi Google trả `retryDelay` khoảng 57 giây.
- **Cần sửa:** code theo luật gọi lại mới trong quyết định D-74 (`20` AI-12), ở `retryDelay` và `callLLMOnce` của `src/server/ai/gemini.ts`.
- **Kiểm tra:** test AI-12 mới xanh; chạy lại probe, tổng quan có kết quả.
- **Ghi chú 06/11:** quyết định D-83 chuyển tổng quan lên đầu phiên, trước loạt `analyze-node`, nên bớt gặp 429. Vẫn phải sửa `retryDelay` như trên. Phần tổng quan mới là C-12.
- **Trạng thái:** chờ kiểm. `retryDelay` đọc `retryDelay` của Google, chờ `max(LLM_RETRY_DELAY_MS, retryDelay)` + jitter, vượt `LLM_RETRY_DELAY_MAX_MS` thì không gọi lại; `analyze`, `overview`, `questions`, `callLLMWithRetry` dừng đúng. Test AI-12 (R1) xanh. **Chưa chạy AI thật** (cần chạy lại sau C-12 vì tổng quan đổi thời điểm gọi).

### C-06 · Vừa · Điểm dở luôn rỗng

- **Hiện tượng:** cùng lần đo, 24/24 lần phân tích (12 bài, cả lời gọi AI và agent) có `weak_points` rỗng, kể cả bản agent không qua cổng gác. Đo thêm repo `gothinkster/node-express-realworld-example-app` cùng ngày: 7 lần phân tích thành công (5 bản qua cổng gác, 2 bản JSON thô chưa qua cổng gác) đều có `weak_points` rỗng; các lần còn lại bị Google trả 503. Chạy lại lần 2 (giãn 8 giây): 3 bản JSON thô thì 1 bản có điểm dở hợp lý (bài Create Article: service nhận tham số `any`, không có schema validation), nhưng lần `analyzeNode` riêng của bài đó trả `null` sau 2 request, chưa rõ do cổng gác hay 503; 8 bản qua cổng gác đều rỗng.
- **Nguyên nhân:** nghi chủ yếu do prompt hoặc model (bản thô chưa qua gác cũng gần như luôn rỗng); chưa loại trừ cổng gác chặn bớt, cần ghi lý do chặn để biết. Prompt `analyze-node` có câu "Không chắc thì mảng rỗng — không bịa lỗi cho có", nghi model nhỏ hiểu quá chặt.
- **Cần sửa:** chạy thêm 1–2 repo khác. Nếu vẫn rỗng thì sửa prompt `analyze-node` và đổi `PROMPT_VERSION`.
- **Kiểm tra:** repo demo có ít nhất 1 bài có điểm dở hợp lý, qua duyệt tay.
- **Trạng thái:** chờ kiểm. Nguyên nhân đo được: schema viết `skills` trước `weak_points`, model chọn đủ 3 kỹ năng rồi gắn điểm dở vào kỹ năng chưa chọn nên A3 lọc (log `weak_points_filtered`, lý do `skill_not_chosen`). Đã sửa prompt và thứ tự schema, không nới A3. Đo `realworld` 12 bài, mỗi cách 1 lần: trước 0/12 bài có điểm dở sau cổng gác, sau 2/12, cả 2 hợp lý qua duyệt tay. **Chưa đo trên repo demo** (Q-03 chưa chốt), mới đo 1 lần nên chưa kết luận chắc. `PROMPT_VERSION` code đổi `1.0.0` ⇒ `1.1.0` cho khớp `02`, để cache phân tích cũ hết hiệu lực. Ca ghi ở `review/loi_da_gap.md`.

---

## Vai A — Tích hợp, deploy

### A-01 · Vừa · Workflow Cloud Run luôn thất bại

- **Hiện tượng:** `deploy` thất bại 6 lần gần nhất vì thiếu xác thực GCP. Site Vercel không bị ảnh hưởng.
- **Cần sửa:** đặt secret theo `deploy.yml`, hoặc tắt workflow nếu nhóm chỉ dùng Vercel.
- **Trạng thái:** đã xác nhận, chờ quyết Q-C.

### A-02 · Vừa · Lỗi thật bị che

- **Hiện tượng:** `toErrorResponse` đổi lỗi lạ thành `ERR_PERSISTENCE_UNAVAILABLE`, log chỉ có tên lỗi.
- **Cần sửa:** ghi thêm thông tin an toàn để tìm lỗi trong `src/server/errors.ts`.
- **Trạng thái:** chờ kiểm. Nhánh `a/fix-a02-a04-log-khoi-dong`: log `error_name`, `error_message` đã che secret, có test với `password=` và chuỗi kết nối Postgres. Typecheck, lint, 752 test, build xanh.

### A-03 · Vừa · Lỗi 401 chưa rõ nguyên nhân

- **Hiện tượng:** từng gặp "Phiên đăng nhập đã hết hạn", sau đó đăng nhập lại thì hết.
- **Cần sửa:** gặp lại thì lưu request và phản hồi ở tab Network để tìm nguyên nhân.
- **Trạng thái:** chưa tái hiện được.

### A-04 · Nhẹ · Chưa kiểm biến AI lúc khởi động

- **Hiện tượng:** `assertGeminiEnv` chỉ chạy khi gọi Gemini.
- **Cần sửa:** gọi ở bước khởi động, ví dụ `instrumentation.ts`.
- **Trạng thái:** chờ kiểm. Nhánh `a/fix-a02-a04-log-khoi-dong`. Chạy `next start` thật: thiếu `GEMINI_API_KEY` với `studio` ⇒ `Failed to prepare server`, nhưng tiến trình không tự thoát; `vertex` không có key ⇒ `/api/health` 200. Chưa thử trên Vercel.

### A-05 · Nhẹ · A06 chưa trả `analyses`

- **Hiện tượng:** `src/app/api/ingest/route.ts` còn `analyses: {}`.
- **Cần sửa:** trả phân tích có sẵn khi mở lại phiên theo `03` Mục 6.6.
- **Trạng thái:** chờ kiểm. Nhánh `a/fix-a05-analyses`: `ingest` đọc `ai_cache` theo khóa `NODE_ANALYSIS`, trả `NodeAnalysisView`, dòng hỏng thì bỏ. Typecheck, lint, 767 test, build xanh. Test dùng DB mock, chưa chạy với Postgres thật.

---

## Quy trình cho agent

Làm từ trên xuống. Đang là bản tập dượt, nên mọi luật trong `CLAUDE.md` và `AGENTS.md` vẫn áp dụng.

### 1. Chuẩn bị

1. Đọc toàn bộ file này, kể cả lỗi mới được thêm.
2. Chạy `git status` và `git pull`. Commit `1066d4d` ở nhánh `b/fix-nest-buoc-dau` có bản sửa B-01. PR #129 đã đóng, nên lấy commit này vào nhánh sửa, không làm lại.
3. Chọn lỗi theo cột **Code** của mình trong [Lộ trình mới ngày 06/11/2026 (chiều)](#lộ-trình-mới-ngày-06112026-chiều). Lỗi không có trong lộ trình thì làm Nặng, rồi Vừa, rồi Nhẹ.

### 2. Lỗi nào được làm

| Trạng thái | Việc của agent |
| :-- | :-- |
| `chưa làm` | Làm theo mục 3 |
| `cần xác minh`, `cần chạy lại`, `cần đo` | Xác minh trước, ghi kết quả vào lỗi. Không tái hiện được thì để nguyên, không sửa theo phỏng đoán |
| `chờ quyết Q-x` | Bỏ qua, báo trong tổng kết |
| `chờ kiểm`, `xong` | Bỏ qua |

Lỗi không xác định được cách sửa thì dừng lỗi đó và hỏi, không tự đặt tên, con số hay luật mới.

### 3. Sửa một lỗi

1. **Spec trước:** tra lỗi trong [Việc sửa spec](#việc-sửa-spec). Đổi quyết định thì sửa `00_QUYET_DINH.md` trước, rồi các file nó trỏ tới.
2. **Test:** viết test thất bại trước, tên test bắt đầu bằng mã luật.
3. **Code:** sửa đúng file của vai đó, theo đúng `docs/spec/02_CONTRACTS.md`.
4. **Phiếu:** thêm ô kiểm theo [Việc sửa phiếu](#việc-sửa-phiếu), để lần code lại không lặp lỗi.
5. **Đổi phiên bản khi cần:**
   - Đổi luật Tầng 0–2 làm đổi đồ thị hoặc `node_id`: đổi `ENGINE_VERSION` (Q-F).
   - Đổi prompt hoặc `responseSchema`: đổi `PROMPT_VERSION`, thêm ca vào `review/loi_da_gap.md`, chạy lại các ca cũ (quyết định D-51).
6. **Kiểm:** chạy `npm run typecheck`, `npm run lint`, `npm test`. Đổi contract thì dùng skill `kiem-contract`. Làm đúng mục **Kiểm tra** của lỗi, trên repo thật nếu lỗi ghi vậy.
7. **Ghi lại:** đổi trạng thái thành `chờ kiểm`, kèm kết quả kiểm. Không chạy được bước nào thì ghi rõ bước đó.

### 4. Luật bắt buộc

- AI không `git add`, commit, push hay merge. Người của vai kiểm rồi tự commit. Mỗi vai một nhánh, ví dụ `b/fix-...`.
- Không đọc, in hay commit `.env*`.
- Không dùng `agy --dangerously-skip-permissions`. Quyền của `agy` giới hạn đúng theo file của lỗi đang sửa.
- Test xanh trên `shop-api` chưa đủ để kết luận engine đúng. Lỗi về engine phải chạy trên repo thật.
- Không ghi "chặn 100%" hay "hết lỗi" khi chỉ mới kiểm một trường hợp.

### 5. Tổng kết sau mỗi lượt

Báo 4 nhóm: lỗi đã chuyển `chờ kiểm`, lỗi bỏ qua vì chờ quyết, lỗi xác minh không ra, và bước chưa chạy được.

---

## Việc sửa spec

Các file ở `docs/spec/`. Đã làm ngày 05/11/2026 theo [`phan-tich-sua-tai-lieu.md`](phan-tich-sua-tai-lieu.md), gồm cả S-15 … S-26. Còn S-11 chờ Q-C, Q-03 chờ nhóm chốt repo demo. Mọi việc phải sửa cả ca test của file đó khi có.

| Mã | File | Sửa gì | Lỗi | Chờ |
| :-- | :-- | :-- | :-- | :-- |
| S-01 | `11` ENG-20 | Ghi rõ `line_start` của method chỉ tính decorator của chính nó | B-01 | Q-E |
| S-02 | `11` ENG-40, `12` Mục 1 | Route phải có receiver hợp lệ và đối số cuối là handler. Nêu cách xử lý router truyền qua tham số hoặc import | B-03 | Q-E |
| S-03 | `00`, `10` ING-87, `11` | Thêm luật bỏ candidate mang cờ test. Sửa ý "vẫn chỉ trừ điểm" của quyết định D-63 | B-02 | Q-E |
| S-04 | `11` ENG-82 | Sửa mẫu Prisma cho chuỗi `this.prisma.x` | B-06 | Q-E |
| S-05 | `00`, `10` ING-131, `11` Mục 1 | Ghi đúng ngôn ngữ code đang có, chuyển phần còn lại sang `KNOWN_NO_GRAMMAR` | B-07 | Q-E |
| S-06 | `30` | Bỏ `fitView` lúc mở, sửa T32. Đổi nhãn "Lộ trình học chính". Thêm bảng đổi `details.hint`, luật cửa sổ ở 1366×768, tên tầng tiếng Việt, ca bấm được node, ẩn giải thích khi trả lời, không hiện cảnh báo thời gian cho người học | B-10, D-01, D-03, D-04, D-05, D-06, D-07, D-12 | Q-E |
| S-07 | `30`, `04` Mục 15 | Viết lại theo giao diện thật: `/learn`, ngăn kéo, `/roadmap`, không có `cockpit/*` | D-09, D-10 | Q-D, Q-E |
| S-08 | `20`, `02` | Ghi rõ `LLM_THINKING_BUDGET = 0` thì không gửi `thinkingConfig`, để không lặp lỗi 400 | Lỗi `thinkingBudget` đã sửa | đã sửa ở quyết định D-74, chờ kiểm |
| S-09 | `20` | Thêm luật câu hỏi: dòng nhắc tới phải đúng quan hệ trong code, không trả lời được bằng cách chép Tab 1. Thêm luật log lỗi Gemini | C-01, C-03, C-04 | đã sửa ở quyết định D-74, chờ kiểm |
| S-10 | `04` Mục 9 | Thêm trường log an toàn cho lỗi lạ, kiểm biến môi trường lúc khởi động | A-02, A-04 | không |
| S-11 | `00`, `04`, `05` | Đổi host chính theo quyết định của nhóm | A-01 | Q-C |
| S-12 | `50` Mục 5 | Thêm vào DoD: repo NestJS nghiệp vụ, đọc nội dung bài, một vòng học trên site thật, thử ở 1366×768 | Mọi lỗi lọt qua test | không |
| S-13 | `00`, `11`, `50` | Thêm quyết định D-73 và ca test cây bài học | B-04, B-05 | Q-B |
| S-14 | `00`, `01`, `02`, `03`, `04`, `20`, `22` | Quyết định D-74: gợi ý theo lượt và bậc BKT, chấm nhớ lượt trước, đặt câu hỏi nhớ ý đã hụt, tra tên xuyên bài khi chấm (chỉ tên), gọi lại theo `retryDelay` | C-05 | đã sửa, chờ kiểm |

Không cần sửa spec, chỉ sửa code và phiếu: B-11, D-08, D-11, A-05. Các lỗi còn lại chưa rõ thì xác minh trước.

## Việc sửa phiếu

Các file ở `docs/quy-trinh-code-21h/`. Đã làm ngày 05/11/2026: mỗi phiếu có mục "Bắt buộc theo bản chạy thử", và cách làm nhanh ở [`lam-phieu.md`](lam-phieu.md). Trước khi thêm ô, xem phiếu đã có ý đó chưa. Không tự sửa `phieu-can-co.md`, vì file này do công cụ sinh ra.

| Phiếu | Thêm hoặc sửa | Lỗi |
| :-- | :-- | :-- |
| `vai-B/README.md` | Đổi các dòng "đã chốt" thành trỏ tới quyết định trong spec, sau khi xong S-01 … S-05, S-13 | B-01 … B-05 |
| B05 | Ô kiểm receiver của route, có ca `cache.get('k', loadFn)` | B-03 |
| B06 | Ô kiểm bước gọi `this.prisma.x` có nhãn `DATA_ACCESS` | B-06 |
| B07 | Ô kiểm không có bước rỗng | B-11 |
| B08 | Viết `engine-that.mjs` hoặc bỏ yêu cầu dùng công cụ này, vì repo chưa có | Công cụ thiếu |
| D03 | Bỏ ô `fitView`. Thêm ô bấm được node sẵn sàng, node khóa không vào được, nút "Thử lại" chạy | D-01, D-07 |
| D05 | Ô thử cửa sổ Tổng quan ở 1366×768, hiện tên tầng tiếng Việt | D-05, D-06 |
| D06 | Ô đổi phiên không còn thấy bài cũ, số liệu Lộ trình đúng | D-09, D-10, D-11 |
| D07 | Ô thử cửa sổ kết quả ở 1366×768, ẩn giải thích khi trả lời, backtick hiện dạng code | D-05, D-08, D-12 |
| C01 | Ô lỗi Gemini có log mã lỗi | C-01 |
| C06, C07, C08 | Ô chạy AI thật, đọc nội dung câu hỏi và đáp án, không chỉ xem test xanh | C-02, C-03, C-04 |
| C04 | Ô gọi lại theo `retryDelay`, không gửi `thinkingConfig` khi budget 0, log lỗi Gemini (D-74) | C-01, C-05 |
| C06 | Ô chạy AI thật trên repo demo, có bài có điểm dở | C-06 |
| C07 | Ô khối `<learner_history>` và 2 luật câu hỏi mới (D-74) | C-03, C-04 |
| C08 | Ô gợi ý theo bậc, khối lượt trước, khối tra tên xuyên bài (D-74) | — |
| C09 | Ô tổng quan chạy được ngay sau khi phân tích hết bài | C-05 |
| A06, A12 | Ô rà phần làm tạm còn sót, `analyses` trả đúng khi mở lại phiên | A-05 |
| A11 hoặc A12 | Ô lỗi lạ có log đủ để tìm nguyên nhân, kiểm biến môi trường lúc khởi động | A-02, A-04 |
| E06, E09 | Chạy thêm repo NestJS nghiệp vụ, đọc nội dung 3 bài, làm trọn một vòng học trên site thật, thử ở 1366×768 | Mọi lỗi lọt qua test |
| `README.md` của thư mục | Sửa link `../../spec`, `../../doc-de-hieu` thành đường đúng trong `docs/`. Thống nhất phiếu trỏ cùng một chỗ spec, vì `.kb/spec` có thể cũ hơn `docs/spec` | Link hỏng |

## Cần nhóm quyết

Agent không tự trả lời các câu này. Nhóm chốt xong thì đổi cột **Trạng thái** thành hướng đã chọn, và đổi trạng thái các lỗi đang chờ thành `chưa làm`.

| Mã | Câu hỏi | Đề xuất | Việc bị chặn | Trạng thái |
| :-- | :-- | :-- | :-- | :-- |
| Q-A | Luật đạt bài, xem chi tiết bên dưới | Giữ luật, hiện "Đạt 2/3 câu" | Một phần D-09 | chờ quyết |
| Q-B | Có thêm quyết định D-73, nối bài thành cây theo module không? | Có, nhưng phải thử kỹ khóa bài | B-04, B-05, S-13 | cây, Minh chốt 05/11/2026 |
| Q-C | Host chính của vòng 2 là Cloud Run hay Vercel? | Vercel, tắt workflow Cloud Run, vì GCP còn thiếu secret | A-01, S-11 | chờ quyết |
| Q-D | Spec 30 theo giao diện thật hay đổi code về 3 cột? | Viết lại spec theo giao diện thật | S-07 | giao diện mới, Minh chốt 05/11/2026 |
| Q-E | 6 file spec đã vượt trần byte: nâng trần hay cắt bớt? | Nâng trần cho `02`, `10`, `20`, `21`, `30`, ghi một quyết định, cắt `00` | Việc spec có cột Chờ là Q-E | nâng trần, quyết định D-75 |
| Q-F | Có nâng `ENGINE_VERSION` lên `1.7.0` và gom các đổi engine vào một lần không? | Có | Bước đổi phiên bản của B-01 … B-07 | không cần giữ phiên cũ, đợt 1 lên `1.7.0`, đợt 2 lên `1.8.0`, Minh chốt 05/11/2026 |

### Q-A · Luật đạt bài

Đúng 2/3 câu mà bài vẫn `Chưa đạt`, không học lại được trong phiên. Đây là luật đang có (03 Mục 6.5, quyết định D-16, D-35), bài sau vẫn mở kèm ⚠.

| Hướng | Thay đổi | Đánh đổi |
| :-- | :-- | :-- |
| Giữ luật, sửa hiển thị | Hiện "Đạt 2/3 câu" | Ít việc nhất, nên chọn cho bản thi |
| Đạt theo tỉ lệ | Đúng từ 2/3 là `Hoàn thành` | Đổi luật tính điểm |
| Cho làm lại câu sai | Trả lời lại câu chưa đạt | Đổi quyết định D-16, D-35, đụng Vai A, C, D |

## Không cần sửa

- **B-08 Node 0 bước:** chạy lại 9 repo thật, `khong_buoc = 0` ở cả 9 repo. Chưa rõ repo gốc của E06-11, gặp lại thì mở lại.
- Không có nút zoom: báo nhầm, nút đã có ở `CanvasToolbar.tsx`.
- Bài `Chưa đạt` không học lại được: đúng spec, xem Q-A.
- Nút "Bắt đầu trả lời (1 câu)": đúng, vì đã xong 1 trong 2 câu.

## Chưa kiểm được

- Vercel có `GITHUB_TOKEN` chưa. Thiếu token thì repo lớn lùi về zip bị cắt: `fastapi/fastapi` chỉ còn 3 file docs, có token thì ra 100 file trong `fastapi/`. Thử bằng cách dán `fastapi/fastapi`, nếu thấy "Không lấy được danh sách file" là thiếu.
- `/api/ingest` chưa khai báo `maxDuration`. Repo lớn mất 10–25 giây, cần xem giới hạn thời gian của Vercel.
- Biến môi trường và log của Vercel.
- `Auth Login` sau bài `Auth Me` chưa đạt có mở kèm ⚠ không.
- Nút "Báo sai kết quả chấm" có đổi màu node ngay không.

---

## Lỗi mới ngày 06/11/2026

Kiểm trên `main` commit `15f7fa7`. Số liệu engine đo bằng cách quét chính code `main` qua zip. Lỗi giao diện đã kiểm ở cả `main` và nhánh `feat/giao-dien-ide`.

Các lỗi này nằm ở cuối file theo yêu cầu của Minh, chưa xếp vào **Thứ tự nên sửa**, **Vai B theo phiếu**, **Việc sửa spec**. Lỗi ghi "cần quyết định mới" đang đúng spec hiện tại, nên nhóm phải chốt luật mới rồi mới sửa code.

### B-35 · Vừa · Component giao diện thành bài thuật toán

- **Hiện tượng:** quét code `main` ra 7 bài `ALGORITHMIC_CORE`, cả 7 đều là trang giao diện, không có thuật toán thật. Trong đó 5 bài là `<module>`, thuộc B-27. 2 bài còn lại là component React: `History Content` (16 điểm) và `Learn Cockpit Content` (124 điểm).
- **Nguyên nhân:** ENG-71 cộng điểm cho `? :`, `&&` và hàm lồng. JSX dùng nhiều `a ? b : c`, `x && <div/>`, `.map(() => …)` lồng nhau, nên component dễ vượt `CONFIG.VIP_COMPLEXITY_MIN`. Code đang đúng `11` Mục 7.
- **Cần sửa:** đề xuất không chọn hàm trả về JSX làm VIP, hoặc không tính `? :`, `&&` nằm trong JSX. Ghi quyết định mới vào `00`, sửa `11` Mục 7 và `complexity.ts`, đổi `ENGINE_VERSION`. Làm cùng B-27.
- **Kiểm tra:** quét code `main`, không còn bài `ALGORITHMIC_CORE` nào trỏ tới file `.tsx`. Quét riêng phần server vẫn còn bài thuật toán thật như `Tarjan Scc`.
- **Ảnh hưởng demo:** chỉ khi repo demo có giao diện React.
- **Trạng thái:** chờ kiểm. Nhánh `b/fix-b27-module`. Quyết định D-86, Minh chốt 06/11/2026: hàm có `return` trả JSX không là ứng viên ENG-90, không đổi ENG-71. Thêm `returnsJsx` ở `complexity.ts`, T-ENG-51. Quét repo này: 0 bài `ALGORITHMIC_CORE` trỏ tới `.tsx`, vẫn còn `Tarjan Scc`, `Build Graph`. Hàm chỉ có callback trả JSX vẫn được chọn. Đã đổi `ENGINE_VERSION` thành `1.7.0`.

### B-36 · Vừa · Cắt còn 20 bài thì bài server bị mất

- **Hiện tượng:** quét code `main` ra 93 bài, giữ 20, bỏ 73. Trong 20 bài giữ lại có 10 bài bắt đầu từ file `.tsx`. Các luồng `/api/sessions/[id]/history`, `/api/sessions/[id]/progress`, `/api/health`, `/api/demo/persona` bị bỏ.
- **Nguyên nhân:** ENG-114 giữ bài có `cognitive_complexity > CONFIG.VIP_COMPLEXITY_MIN` trước, rồi mới xét `rank_score` (`nodes.ts`). Bài có điểm cao do B-35 chiếm chỗ của bài server. Code đang đúng spec.
- **Cần sửa:** đề xuất ưu tiên bài luồng trên đường chính trước bài thuật toán. Ghi quyết định mới vào `00`, sửa ENG-114 và `nodes.ts`, đổi `ENGINE_VERSION`. Làm sau B-35 rồi đo lại, vì B-35 có thể đã giảm phần lớn lỗi này.
- **Kiểm tra:** quét code `main`, phần lớn bài giữ lại là luồng server. Chạy thêm repo fullstack lớn mà nhóm gặp lỗi này.
- **Ảnh hưởng demo:** chỉ khi repo demo có trên 20 bài và có giao diện.
- **Trạng thái:** đã chạy thật, chưa làm. Cần quyết định mới.

### B-37 · Nặng · Lát cắt toàn hàm vặt, thiếu phần xử lý chính

- **Hiện tượng:** bài `Create Evaluate-feynman` có 7 bước: `POST /api/evaluate-feynman`, `authenticateRequest`, `extractBearerToken`, `verifyToken`, `getSupabaseAuth`, `ApiHttpError.constructor`, `defaultMessage`. Bài không có `evaluateFeynman`, nên người học không thấy phần chấm. 6/10 bài API có cùng chuỗi xác thực này. Chỉ quét phần server vẫn ra kết quả đó.
- **Nguyên nhân:** ENG-81 giữ hàm có giá trị trả về được dùng hoặc có `throw`, nên hàm xác thực và hàm dựng lỗi đều được giữ. Nghi ENG-88 (`slicing.ts`, trần `NODE_MAX_LINES`, `NODE_MAX_CODE_TOKENS`) cắt các bước cuối, làm mất hàm chính đứng sau. Code còn sắp callee theo tên, trong khi ENG-80 ghi theo dòng, cột của lời gọi. Chưa đo riêng từng nguyên nhân.
- **Cần sửa:** đo xem bước nào bị bỏ ở đâu, rồi chốt luật bỏ hàm vặt khỏi lát cắt. Đề xuất: hàm ngắn, không đụng database, được nhiều route gọi. Ghi quyết định mới vào `00`, sửa ENG-80, ENG-81, ENG-88 nếu cần, và `slicing.ts`. Đổi `ENGINE_VERSION`.
- **Kiểm tra:** quét code `main`, bài `Create Evaluate-feynman` có `evaluateFeynman` và hàm chấm, các bài API không còn chung chuỗi xác thực. Chạy thêm trên BrewLite.
- **Ảnh hưởng demo:** cần đo trên BrewLite.
- **Trạng thái:** đang làm. Nhánh `b/fix-b27-module`. Đo trên repo này: ENG-81 làm mất 35/439 bước, ENG-88 làm mất 320/439, nên giả thuyết ENG-88 là đúng. Đã sửa code theo spec: ENG-80 sắp callee theo (dòng, cột) call site, ENG-88 bỏ bước lá hop lớn nhất, chỉ bảo vệ đường tới criterion. Thêm D-87, Minh chốt 06/11/2026: bỏ hàm có mặt ở ≥ 50% số lát cắt và ≥ 3 lát cắt, không là entry, middleware, cây con không có `DATA_SINK`. Quét repo này: bài API hết chuỗi xác thực, `Create Evaluate-feynman` có `evaluateFeynman`. BrewLite giữ 17 bài, 9 cạnh, Capstone `Create Order`. **Còn thiếu:** `gradeWithAI` chưa vào bài, vì bước `evaluateFeynman` bị kẹp ở `CONFIG.STEP_MAX_LINES` và bài chạm `CONFIG.NODE_MAX_LINES`. Repo này dùng `sql` dạng tagged template nên không có `DATA_SINK`, 0/11 bài tới `DATA_ACCESS`. 2 hằng số D-87 đang để cục bộ ở `slicing.ts`, chờ Luồng 5 chuyển vào `CONFIG`.

### D-16 · Vừa · Khung code nối mọi file thành một file dài

- **Hiện tượng:** bài có nhiều file nhưng Monaco chỉ hiện một khối dài, nên khác cách đọc code trong VS Code. Gặp ở cả `CodePane.tsx` của `main` và `MonacoPane.tsx` của `feat/giao-dien-ide`.
- **Nguyên nhân:** `buildSliceModel` nối mọi bước thành một model. Code đang đúng phần tả model node trong `30`.
- **Cần sửa:** đề xuất mỗi file một tab, bấm bước nào thì mở tab file đó. Sửa `30`, `slice-model.ts`, `CodeSnippetViewer.tsx`. Dữ liệu chỉ có `snippet` của từng bước, nên tab chỉ hiện được các lát cắt của file, không phải cả file.
- **Kiểm tra:** bài có 3 file hiện 3 tab, bấm bước thì đúng tab mở ra, tô sáng và gợi ý `CODE_POINTER` vẫn đúng bước. Chạy lại T1–T41 phần code.
- **Trạng thái:** đã kiểm code, chưa làm. Cần quyết định mới.

### D-17 · Nhẹ · Bấm điểm dở chỉ tô cả bước

- **Hiện tượng:** bấm điểm dở ở X-Ray hoặc bảng dưới chỉ đổi `active_step`, nên cả bước được tô, dù server đã trả `line_start`, `line_end` của điểm dở.
- **Nguyên nhân:** UI-33 chỉ yêu cầu đổi `active_step`, code đang đúng spec. Điểm hay chỉ có `step`, `text`, không có số dòng, nên chưa tô từng dòng được.
- **Cần sửa:** đổi dòng gốc sang dòng trong model bằng `snippet_line_map`, rồi tô và cuộn tới đúng dòng. Sửa UI-33 trong `30`. Muốn làm cả điểm hay thì phải đổi contract, cần hỏi nhóm trước.
- **Kiểm tra:** bấm một điểm dở, Monaco cuộn và tô đúng dòng ghi ở X-Ray.
- **Trạng thái:** đã kiểm code, chưa làm. Cần quyết định mới.

### D-18 · Nhẹ · Câu không đặt được vẫn hiện ô ⊘

- **Hiện tượng:** câu `DROPPED` vẫn hiện "⊘ AI không đặt được câu này — không tính". Gặp ở `FeynmanQuestionSection.tsx` của cả `main` và `feat/giao-dien-ide`.
- **Nguyên nhân:** `30` yêu cầu hiện biểu tượng ⊘. Không thay bằng câu mẫu được, vì quyết định D-03 đã bỏ câu dự phòng.
- **Cần sửa:** sửa `30`, rồi ẩn câu `DROPPED` ở danh sách và không đếm vào `Câu {k}/{n}`. Giữ nguyên dữ liệu `DROPPED` và luật BKT.
- **Kiểm tra:** run có 1 câu `DROPPED` không hiện ô ⊘, số câu đếm đúng, node vẫn chốt đúng theo bảng ở `22`.
- **Trạng thái:** đã kiểm code, chưa làm. Cần quyết định mới.

### C-07 · Vừa · Tóm tắt không nói phần này giúp người dùng làm gì

- **Hiện tượng:** phần tóm tắt được yêu cầu nói về cách chia việc trong code, nên người học không biết bài này giúp người dùng làm gì.
- **Nguyên nhân:** `src/server/ai/prompts/analyze.ts` và `20` đều ghi `summary = tối đa 2 câu: các bước chia việc ra sao`.
- **Cần sửa:** đổi thành câu 1 nói phần này giúp người dùng làm gì, câu 2 nói các bước chia việc. Sửa `20`, prompt, đổi `PROMPT_VERSION`, thêm ca vào `review/loi_da_gap.md`. Không đổi contract. Sau đó Vai D đưa câu 1 lên đầu tab X-Ray.
- **Kiểm tra:** chạy AI thật trên repo demo, duyệt tay ít nhất 3 bài, câu đầu nói đúng việc của người dùng.
- **Ghi chú 06/11:** quyết định D-84 dùng câu 1 này làm dòng "Vai trò" của thẻ vai trò (D-22). Sửa thêm `steps[].text` cho người mới đọc, vì tour (D-19) hiện từng câu này.
- **Trạng thái:** đã kiểm prompt, chưa chạy AI thật, chưa làm.

### C-08 · Vừa · Code AI chưa theo quyết định D-74

- **Hiện tượng:** `main` chưa có gợi ý theo bậc người học, chấm nhớ lượt trước, câu hỏi nhớ ý đã hụt, tra tên xuyên bài. `grade.ts` chỉ xét số lượt: lượt 1 là `CONCEPT`, sau đó là `CODE_POINTER`. Prompt chưa có `<previous_answer>`, `<previous_points>`, `<learner_history>`. `config.ts` thiếu `HISTORY_MISSED_POINTS_MAX`, `GRADE_REFERENCED_MAX`, và `PROMPT_VERSION` còn `1.0.0` trong khi spec ghi `1.1.0`.
- **Nguyên nhân:** quyết định D-74 chốt sau khi code AI của `main` đã xong. `feat/giao-dien-ide` đã có các phần này nhưng dùng tên file khác spec, nên phải viết lại trên `main`, không chép thẳng.
- **Cần sửa:** làm theo các ô D-74 trong phiếu `vai-C/C07-cau-hoi.md`, `vai-C/C08-cham.md`. Phần trần `retryDelay` thuộc C-05.
- **Kiểm tra:** test AI-31 xanh theo từng bậc. Chạy AI thật một câu qua 3 lượt sai, gợi ý đổi đúng bảng trong quyết định D-74.
- **Trạng thái:** đã kiểm code, chưa làm.

### A-07 · Vừa · Chưa có test tích hợp đủ luồng trên `main`

- **Hiện tượng:** `main` chỉ có 1 ca đi qua Postgres thật ở `src/server/__tests__/postgres-that.test.ts`, và ca này bị bỏ qua khi thiếu `TEST_DATABASE_URL`. 21 ca ở `tests/integration/flow.test.ts` chỉ có trên `feat/giao-dien-ide`. `ci.yml` không dựng Postgres. Vì vậy chưa có test tự động cho luồng trả lời sai, nhận gợi ý, trả lời đúng, rồi kiểm điểm BKT qua `/api/me`.
- **Nguyên nhân:** test cần database riêng, nhưng máy nhóm và CI chưa đặt sẵn.
- **Cần sửa:** dựng Postgres riêng cho test, trên máy hoặc service của CI, không trỏ tới database thật. Chuyển `flow.test.ts` về `main` và đổi lại fixture theo code `main`.
- **Kiểm tra:** chạy test với `TEST_DATABASE_URL`, không ca tích hợp nào bị bỏ qua. Chạy tay trọn một bài và kiểm điểm BKT qua `/api/me`.
- **Trạng thái:** đã kiểm code, chưa làm.

### C-09 · Vừa · Có điểm hay nhưng không có điểm dở

- **Hiện tượng:** Minh chạy thử thì bản phân tích chỉ có điểm hay, không có điểm dở, nên người học chỉ thấy code được khen. Lỗi này cùng nhóm với C-06, nhưng C-06 chỉ đo `weak_points` rỗng, chưa so với điểm hay.
- **Nguyên nhân:** chưa rõ phần nào chính. Code đang xử lý hai loại không ngang nhau:
  - Prompt `analyze.ts` ghi điểm hay "không có thì mảng rỗng", còn điểm dở ghi "Không chắc thì mảng rỗng — không bịa lỗi cho có".
  - Cổng gác `guard/analysis.ts` chỉ cần điểm hay có bước hợp lệ và không trùng bước. Điểm dở phải có bước hợp lệ, kỹ năng nằm trong số kỹ năng đã chọn, và `symbol` nằm trong bước (A3).
  - Điểm dở bị A3 lọc mà bản phân tích vẫn đạt thì không gọi lại AI, cũng không ghi log, vì `logGuardBlock` chỉ chạy khi bản phân tích hỏng hoặc thành `skeleton_only`.
  - Nghi lát cắt thiếu phần xử lý chính (B-37) cũng làm AI ít thứ để chê.
- **Cần sửa:** làm cùng C-06, theo thứ tự:
  1. Ghi log mọi điểm dở bị A3 lọc, kèm lý do.
  2. Trên repo demo, đếm điểm hay, điểm dở ở bản thô và bản sau cổng gác.
  3. Bản thô đã rỗng thì sửa prompt: yêu cầu soát lần lượt hiệu năng, bảo mật, toàn vẹn dữ liệu, xử lý lỗi trước khi kết luận không có điểm dở. Đổi `PROMPT_VERSION`, thêm ca vào `review/loi_da_gap.md`.
  4. Cổng gác lọc nhiều thì đưa số liệu cho nhóm chốt, không tự nới A3.
  
  Không ép số điểm dở tối thiểu, vì AI sẽ bịa lỗi.
- **Kiểm tra:** chạy AI thật trên repo demo, có số liệu bản thô và bản sau cổng gác. Bài có lỗi thật, ví dụ truy vấn trong vòng lặp, phải có điểm dở hợp lý qua duyệt tay.
- **Trạng thái:** chờ kiểm, làm cùng C-06 (xem trạng thái C-06).

### B-38 · Nặng · Mở hỗ trợ Java để demo bằng repo Java

- **Hiện tượng:** chưa học được repo Java. `huynhthanhnhannnh-pixel/SGU-quan-ly-nha-hang` báo `no_code`, `spring-petclinic` báo `only_manifests` (đo ở B-07). Minh muốn demo vấn đáp bằng repo Java, vì đây là ngôn ngữ nhóm quen nhất và dễ trả lời nhất.
- **Nguyên nhân:** quyết định D-76 đã cắt Java khỏi bản thi. `LANGUAGE_REGISTRY` chỉ có 4 ngôn ngữ. `main` chưa có grammar Java, `queries/java.scm` và resolver Java. Spec `11` đã có luật resolver `JAVA` nhưng chưa có luật route Spring. `fingerprint.ts` đã đọc được `pom.xml`, `build.gradle` và nhận ra Spring.
- **Cần sửa:**
  1. Sửa quyết định D-76 trong `00` trước, rồi sửa `01`, `02`, `10`, `11`, `docs/doc-de-hieu/07_ke_hoach_21h.md`. Java không còn vào `KNOWN_NO_GRAMMAR`, nên B-07 và S-05 đổi theo. Go, Dart giữ như cũ.
  2. Thêm `tree-sitter-java.wasm` vào `public/grammars/`, bản chạy được với `web-tree-sitter` 0.27.1. Thêm `queries/java.scm` và adapter `JAVA` trong `registry.ts`.
  3. Đọc class, method, import, thêm `resolvers/java.ts` theo luật `JAVA` trong `11`.
  4. Viết luật mới trong `11`, rồi code: route Spring (`@RestController`, `@RequestMapping`, `@GetMapping`, `@PostMapping`…), tầng controller, service, repository, và lời gọi JPA thành `DATA_ACCESS`.
  5. Bỏ `src/test/java` khỏi bài học. Kiểm Monaco tô màu Java, AI đọc được code Java, comment bước dùng `//`.
  6. Thêm repo mẫu Spring vào test engine. Đổi `ENGINE_VERSION`.
  7. Chốt một repo Java làm repo demo, rồi dựng lại gói Offline và kịch bản demo theo repo đó.
- **Kiểm tra:** quét `spring-petclinic` và `SGU-quan-ly-nha-hang`: `primary_language` là Java, tier `RESOLVED`, tên bài theo route đúng, có bài đi đủ controller, service, repository và tới `DATA_ACCESS`. Chạy AI thật trọn một bài trên repo demo Java.
- **Ảnh hưởng demo:** có, đổi repo demo và kịch bản vấn đáp.
- **Trạng thái:** đang làm. Nhánh `b/b38-java-nen` xong bước 2–3: grammar, `queries/java.scm`, adapter `JAVA`, đọc class, method, field, import. Quét thật `spring-petclinic`, `SGU-quan-ly-nha-hang`: `JAVA`, tier `RESOLVED`, không lỗi cú pháp, engine ra 7 và 20 node. Chưa có route Spring, tầng, `DATA_ACCESS`, nên tên bài chưa theo route. Bước 4 chờ luật Spring trong `11` và mốc 1.

### B-39 · Nặng · Bản đồ không nối các chức năng với nhau

- **Hiện tượng:** `main` có nhiều chức năng không nối với nhau nên bị kéo thành một hàng. `feat/giao-dien-ide` nối theo thư mục nên ra các cột không có nghĩa, ví dụ `App Hello → Health`, `Auth Me → Login → Register`, tức Đăng nhập đứng trước Đăng ký. Sơ đồ cần có là các chức năng nối theo nghiệp vụ: Đăng ký và Danh sách sản phẩm là điểm bắt đầu, cùng dẫn tới Thanh toán, còn Health và bài thuật toán học riêng.
- **Nguyên nhân:** quyết định D-07 chỉ nối 2 bài khi dùng chung hàm, nên chức năng không chung hàm thì không có cạnh. Quyết định D-73 và `lessonTree` của `feat` nối theo thư mục, không theo nghiệp vụ. Tài liệu gốc của sơ đồ mẫu cũng ghi cạnh là "thứ tự học giả định", tức chưa từng có thuật toán sinh ra nó.
- **Cần sửa:** đổi sang đồ thị phụ thuộc dữ liệu giữa các chức năng, theo ý "có dữ liệu rồi mới dùng được". Bản này thay hướng nối theo module của B-04, B-05.
  1. **Đọc thực thể:** mỗi bài có tập thực thể và thao tác tạo, đọc, sửa, xóa, lấy từ bước `DATA_ACCESS`. Làm cho Prisma, TypeORM, Mongoose, JPA. Không đọc được thì lấy tài nguyên từ route, ví dụ `POST /orders` là tạo `orders`.
  2. **Đọc khóa ngoại:** `@relation` của Prisma, `@ManyToOne` của TypeORM và JPA.
  3. **Tìm nguồn của thực thể:** bài dễ nhất có thao tác tạo. Không có bài tạo vì dữ liệu nhập sẵn thì lấy bài dễ nhất đụng tới thực thể đó.
  4. **Nối cạnh:** nguồn của `E` tới mọi bài dùng `E`. Bài tạo `E` mà `E` có khóa ngoại tới `P` thì nguồn của `P` tới bài đó.
  5. **Bỏ vòng và cạnh thừa:** dùng Tarjan và rút gọn bắc cầu đã có, giữ chiều bài dễ tới bài khó.
  6. **Xếp nhóm:** bài có cạnh ra mà không có cạnh vào là "Bắt đầu". Bài không có cạnh nào là "Học riêng", không khóa, xếp thành cột riêng trong `layout.ts`. Không cần đổi contract, vì nhóm suy ra được từ `prerequisites` và `edges`.
  7. **Repo không đọc được dữ liệu:** quay về luật D-07.
  
  Ghi quyết định mới thay D-07, D-73, sửa D-55 vì quyết định này đang cấm nhãn "Bắt đầu". Phải làm sau B-06, B-37, vì thuật toán cần bước `DATA_ACCESS` đầy đủ. Đổi `ENGINE_VERSION`. Khung nhóm trên bản đồ làm ở đợt giao diện.
- **Thử nghiệm:** đã chạy bản thử chỉ đọc Prisma, trên bản sao tạm, chưa nằm trong repo.

  | Repo | Bài | Hiện tại không có cha | Bản thử |
  | :-- | --: | --: | :-- |
  | `kuuhakubee/CNPM_BrewLite` (`apps/api`) | 13 | 7 | 2 bài bắt đầu, 1 học riêng, 11 cạnh |
  | `gothinkster/node-express-realworld-example-app` | 20 | 9 | 1 bài bắt đầu, 2 học riêng, 17 cạnh |

  BrewLite ra `Auth Register` và `List Products` cùng dẫn tới `Create Order`, rồi tới các bài thanh toán, còn `List Healths` học riêng. Realworld ra `Create User → Create Article → Create Article Comments`. Bài tạo có thể có nhiều bài con, như `Create Article` có 9 bài con. `Auth Register` đang mất lệnh `create` do B-37, nên phải nhờ luật ở bước 3.
- **Kiểm tra:** BrewLite ra đúng các nhóm trên, không còn `Auth Me → Login → Register`. Repo demo Java ra sơ đồ theo nghiệp vụ. Bài học riêng mở được ngay, bài có cha vẫn khóa đúng.
- **Ảnh hưởng demo:** có, ban giám khảo thấy bản đồ ngay từ đầu.
- **Trạng thái:** đã thử bản tạm trên 2 repo, chưa làm. Cần quyết định mới.

## Việc mới theo quy trình học mới

Theo quyết định D-81 … D-84 ngày 06/11/2026 và bản vẽ [`prototype.html`](../../prototype.html). Hướng dẫn sửa doc cho từng người: [`sua-doc-quy-trinh-moi.md`](sua-doc-quy-trinh-moi.md). Tên kiểu, hằng số dùng chung ở Mục 3 của file đó.

### B-40 · Vừa · Bài chưa có thực thể và nhóm chức năng

- **Hiện tượng:** bản đồ là một danh sách bài ngang hàng, không biết bài nào thuộc chức năng nào, đọc ghi dữ liệu gì.
- **Cần sửa:** theo D-84, cùng đợt với B-39: mỗi bài có `entities`, cạnh có `via_entities`, `StaticEngineResult.groups` gom tất định. Sửa `11`, `graph/nodes.ts`, `graph/index.ts`.
- **Kiểm tra:** `shop-api` ra 3 nhóm như `prototype.html`; BrewLite có nhóm theo thực thể; chạy 2 lần ra cùng kết quả.
- **Trạng thái:** chưa làm.

### B-41 · Nhẹ · Bước nạp repo bỏ README

- **Hiện tượng:** tổng quan mới (D-83) cần biết sản phẩm làm gì, nhưng bước nạp repo không giữ README hay mô tả manifest.
- **Cần sửa:** giữ `readme_excerpt` (đã che secret, cắt theo `CONFIG.OVERVIEW_README_MAX_CHARS`) và `manifest_description`. Sửa `10`, `src/server/engine/ingest/*`.
- **Kiểm tra:** repo có README ra đoạn đầu; repo không có ra `null`; secret trong README bị che.
- **Trạng thái:** chưa làm.

### D-19 · Nặng · X-Ray chưa là tour

- **Cần sửa:** theo D-81: thẻ vai trò ⇒ từng bước (lời giải thích, chip kỹ năng, Trước/Sau, phím ← →) ⇒ tóm tắt ⇒ nút sang Feynman. Bấm bước nào thì khung code mở đúng tab file đó (D-16).
- **Kiểm tra:** đi hết tour bài "Xem danh sách sản phẩm" giống `prototype.html`.
- **Trạng thái:** chưa làm.

### D-20 · Vừa · Chưa có thẻ khái niệm

- **Cần sửa:** popover cho 16 kỹ năng: phần viết tay (`vai-D/the-khai-niem.md`) + câu `skills[].reason` của AI + nút xem dòng. 0 token.
- **Kiểm tra:** bấm chip ở bước 2 ra thẻ; nút xem dòng tô đúng dòng; Esc đóng thẻ.
- **Trạng thái:** chưa làm.

### D-21 · Nặng · Tổng quan và bản đồ chưa theo nhóm

- **Cần sửa:** theo D-71, D-83, D-84: bản đồ chia nhóm, tên AI kèm nhãn "AI đặt tên" và tên code ở dòng nhỏ; Tổng quan 2 nhịp, phần tất định hiện ngay, phần AI hiện khi có; nút bắt đầu ở bài gốc của đường chính.
- **Kiểm tra:** tắt AI vẫn có nhóm, tên engine và câu dự phòng; bật AI thì tên và bức tranh chung hiện thêm.
- **Trạng thái:** chưa làm.

### D-22 · Vừa · Chưa có thẻ vai trò

- **Cần sửa:** theo D-84: tên và route, "Vai trò", "Cần trước", "Mở ra cho", "Dữ liệu"; thiếu dữ liệu thì ẩn dòng.
- **Kiểm tra:** bài "Xem danh sách sản phẩm" ra đủ 4 dòng như `prototype.html`.
- **Trạng thái:** chưa làm.

### D-23 · Vừa · Chưa có giải thích đoạn chọn

- **Cần sửa:** theo D-82: bôi đen trong khung code hiện nút "Giải thích"; popover hiện tiêu đề, "Là gì", "Ở đây", "Ví dụ đời thường", kỹ năng liên quan, "Còn dùng ở"; trạng thái chờ, lỗi, hết lượt, bị chặn; nhớ kết quả trên trình duyệt.
- **Kiểm tra:** bôi đen `await` ra giải thích; bôi lại đúng chỗ đó hiện liền, không gửi request.
- **Trạng thái:** chưa làm.

### C-10 · Vừa · Câu đầu chưa là câu kể luồng

- **Cần sửa:** theo D-81: câu đầu của mỗi run có `focus` = `FLOW`. Sửa `22` Mục 6, `src/lib/plan.ts`, test T-PLAN.
- **Kiểm tra:** mọi run có câu 1 là `FLOW`; các luật D-34 vẫn đúng.
- **Trạng thái:** chưa làm.

### C-11 · Vừa · Chưa có lời gọi giải thích đoạn chọn

- **Cần sửa:** theo D-82: prompt, schema, cổng gác, cache `SELECTION_EXPLAIN`, giới hạn `EXPLAIN_MAX_PER_SESSION`. Sửa `20`, `21`, `src/server/ai/*`. Endpoint ở A-08.
- **Kiểm tra:** chạy AI thật 3 vùng chọn (từ khóa, tên, đoạn code); tên bịa bị chặn; vùng chọn sai ra `ERR_SELECTION_INVALID`.
- **Trạng thái:** chưa làm.

### C-12 · Nặng · Tổng quan chờ hết node, chưa đặt tên

- **Cần sửa:** theo D-83: `analyze-overview` gọi ngay sau khi quét, đầu vào gói ngữ cảnh, ra `RepoOverviewRaw` mới; cổng gác mới; câu dự phòng do code dựng. Sửa `20`, `21`, `src/server/ai/*`.
- **Kiểm tra:** quét `shop-api` và BrewLite, tổng quan có trước khi phân tích bài nào; mỗi bài đúng 1 tên, không trùng.
- **Trạng thái:** chưa làm.

### A-08 · Nặng · Contract và endpoint cho quy trình mới

- **Cần sửa:** `02` theo Mục 3 của `sua-doc-quy-trinh-moi.md`; endpoint `POST /api/explain-selection`; bỏ `ERR_OVERVIEW_NOT_READY`; mang frontend `feat/giao-dien-ide` về `main` làm nền cho luồng 6.
- **Kiểm tra:** `npm run typecheck` xanh; gọi endpoint với vùng chọn sai ra 400.
- **Trạng thái:** đang làm. Nhánh `a/fix-a08-explain-selection`: xong kiểu thêm mới, `CONFIG`, 2 mã lỗi, route trả 400 khi vùng chọn sai (test mock, chưa gọi server thật), vùng chọn đúng trả 503 chờ C-11. Typecheck, lint, 702 test xanh. Còn: kiểu đổi `RepoOverviewRaw`, trường mới của node, cạnh, kết quả engine, bỏ `ERR_OVERVIEW_NOT_READY`, frontend.

---

## Lộ trình mới ngày 06/11/2026 (chiều)

Thay các bảng **Chia luồng**, **Mốc trong ngày**, **Nếu trễ thì bỏ trước** của lộ trình bên dưới. Các bảng **Thứ tự trong từng luồng** 1 … 5 bên dưới vẫn dùng, cộng thêm việc mới ở đây. Luật tránh đụng nhau giữ nguyên.

**Bước 1, sửa doc:** mỗi người làm phần mình theo [`sua-doc-quy-trinh-moi.md`](sua-doc-quy-trinh-moi.md), mở PR xong thì sang code.

| Người | Sửa doc | Code, làm từ trái sang phải |
| :-- | :-- | :-- |
| Minh | `spec/11`, dòng D-85 | Luồng 1 như cũ; B-40 làm cùng B-39 ở bước 7 |
| Phat107 | `spec/30`, `spec/10`, `vai-D/`, `prototype.html` | B-14, B-22, B-41 ⇒ B-16, B-29, B-30 ⇒ phụ luồng 6 (nhắn Quý trước khi sửa file) |
| Lê Ngọc Quý | không (đọc `spec/30` của Phat107) | **Luồng 6 Giao diện** theo `prototype.html`: D-16, D-19, D-20, D-17, D-18 ⇒ D-21, D-22, D-23 |
| Huynh Nhan | `spec/20`, `21`, `22`, `vai-C/` | C-01, C-05 ⇒ C-12 ⇒ C-06, C-09 ⇒ C-08 ⇒ C-07, C-10 ⇒ C-11 ⇒ C-03, C-04, C-02 nếu còn giờ |
| Thiện | `spec/02` (làm trước), `03`, `01`, `04` | A-08 ⇒ **luồng 3 Java** (nhận từ Quý) ⇒ luồng 5 như cũ; duyệt và merge |
| Người quay lại sau | `vai-D/the-khai-niem.md` | Phụ D-20 |

**Luồng 6 · Giao diện** (Lê Ngọc Quý) giữ `src/components/*`, các trang trong `src/app/` (trừ `src/app/api/*` của Thiện), `src/store/*`, file dữ liệu thẻ khái niệm.

**Việc nào chờ việc nào.** Cột **Trong lúc chờ** là việc làm trước được, để không ai ngồi không.

| Mã | Người | Chờ | Trong lúc chờ | Xong trước |
| :-- | :-- | :-- | :-- | :-- |
| Doc của mọi người | Cả nhóm | PR mở đợt này (D-81 … D-84, file hướng dẫn) đã merge | — | 18:00 |
| `spec/02` | Thiện | PR mở đợt này | — | **17:30**, làm đầu tiên vì mọi việc có kiểu mới đều chờ nó |
| A-08 phần mang frontend về `main` | Thiện | không | — | 18:00 |
| A-08 phần endpoint `explain-selection` | Thiện | `spec/02`; hàm server của C-11 | Viết route trả lỗi đúng mã, gọi hàm C-11 khi có | 22:00 |
| B-41 | Phat107 | `spec/02` (trường `readme_excerpt`) | B-14, B-22 | 18:30 |
| B-40 | Minh | `spec/02` (`groups`, `entities`); B-39 (bước 7 luồng 1) | Bước 1–6 luồng 1 | 21:00 |
| C-01, C-05, C-06, C-09, C-08, C-07 | Huynh Nhan | không (PR nền đã merge) | — | 20:00 |
| C-10 | Huynh Nhan | `spec/22` của chính mình | — | 21:00 |
| C-12 | Huynh Nhan | `spec/02` (`RepoOverviewRaw` mới) | Viết prompt, cổng gác. Chưa có B-41 thì chạy không README; chưa có B-40 thì chưa đặt tên nhóm | 21:00 |
| C-11 | Huynh Nhan | `spec/02` (kiểu `ExplainSelection*`) | Viết prompt và hàm server, test bằng dữ liệu giả | 22:00 |
| D-16, D-19, D-17, D-18 | Lê Ngọc Quý | A-08 phần mang frontend về `main` | Đọc `prototype.html`, chuẩn bị component | 19:00 |
| D-20 | Lê Ngọc Quý | `vai-D/the-khai-niem.md` | Dùng 3 thẻ mẫu trong `prototype.html` | 19:00 |
| D-21 | Lê Ngọc Quý | C-12, B-40 | Làm phần tất định (nhóm theo đầu route, tên engine, câu dự phòng) với dữ liệu giả | Sau 22:00 |
| D-22 | Lê Ngọc Quý | C-07, B-40 | Làm với các dòng đã có ("Cần trước", "Mở ra cho"), ẩn dòng thiếu | Sau 22:00 |
| D-23 | Lê Ngọc Quý | C-11, A-08 endpoint | Làm popover với dữ liệu giả | Sau 22:00 |
| `vai-D/the-khai-niem.md` | Người quay lại sau | không | — | 19:00 |
| Sửa pitch | Người lo pitch | D-19 … D-23 chạy được | — | Trước khi ngủ |

```mermaid
flowchart LR
  PR0["PR mở đợt<br/>D-81 … D-84"] --> S02["spec/02<br/>Thiện · 17:30"]
  PR0 --> DOC["Doc của từng người<br/>18:00"]
  FE["A-08: frontend về main<br/>18:00"] --> UI1["D-16, D-19, D-20,<br/>D-17, D-18 · 19:00"]
  CARDS["16 thẻ khái niệm"] --> UI1
  S02 --> B41["B-41 README<br/>18:30"]
  S02 --> B40["B-40 nhóm, thực thể<br/>21:00"]
  B39["B-39 luồng 1"] --> B40
  S02 --> C12["C-12 tổng quan<br/>21:00"]
  B41 -.-> C12
  B40 -.-> C12
  S02 --> C11["C-11 giải thích<br/>22:00"]
  C11 --> EP["A-08 endpoint<br/>22:00"]
  C12 --> D21["D-21 tổng quan,<br/>bản đồ nhóm"]
  B40 --> D21
  C07["C-07 câu vai trò"] --> D22["D-22 thẻ vai trò"]
  B40 --> D22
  EP --> D23["D-23 popover"]
```

Mũi tên nét đứt: không chờ được thì chạy thiếu phần đó.

**Mốc trong ngày.**

| Giờ | Mốc | Đạt khi |
| :-- | :-- | :-- |
| 16:30 | Mốc 1, engine `1.7.0` | Như cũ |
| 18:00 | Xong doc | PR doc của mọi người đã merge, `02` đã có tên ở Mục 3 của `sua-doc-quy-trinh-moi.md` |
| 19:00 | Mốc Java, giao diện 1 | Java như cũ. Luồng 6 xong D-16, D-19, D-20, D-17, D-18, chạy với gói Offline |
| 21:00 | Mốc 2, engine `1.8.0` | Như cũ, thêm B-40. C-12, C-10 xong |
| 22:00 | Đóng băng backend | Như cũ, thêm C-11 và A-08. Chạy online trọn 1 bài theo quy trình mới |
| Sau 22:00 | Giao diện 2 | D-21, D-22, D-23; sửa `pitch/KICH_BAN_DEMO.md`, `pitch/PHAN_BIEN_BGK.md` theo quy trình mới |

**Nếu trễ thì bỏ trước:** C-11 và D-23, rồi dòng "Dữ liệu" của D-22, rồi B-41 (tổng quan chạy không có README). Sau đó bỏ tiếp theo danh sách cũ bên dưới.

**Không bỏ:** D-16, D-17, D-18, D-19, D-20, D-21 (ít nhất phần tất định), C-10, C-12, A-08, cùng danh sách "Không bỏ" cũ.

---

## Lộ trình sửa backend ngày 06/11/2026

> Các bảng **Chia luồng**, **Mốc trong ngày**, **Nếu trễ thì bỏ trước** và dòng **Để sang đợt giao diện** dưới đây đã được thay bằng [Lộ trình mới ngày 06/11/2026 (chiều)](#lộ-trình-mới-ngày-06112026-chiều).

Lộ trình này thay mục [Thứ tự nên sửa](#thứ-tự-nên-sửa) trong đợt này. Làm trên `main` commit `15f7fa7`, code `main` chưa đổi từ lúc lập danh sách nên mọi trạng thái ở trên vẫn đúng.

- **Phạm vi:** 51 trong 53 lỗi Vai B, C, A. Sửa trên backend `main`, không dùng backend của `feat/giao-dien-ide`.
- **Để sang đợt giao diện:** toàn bộ lỗi Vai D, B-09, B-10 (2 lỗi này chỉ sửa ở phần hiển thị), phần `CockpitHeader` của B-22, phần X-Ray của C-07.
- **Người ở bảng dưới là đề xuất** theo commit trước đây, nhóm đổi được. Mỗi luồng giữ nguyên file của mình dù đổi người.

### Bước 0 · Chốt trước khi code (xong trước 13:00)

| Việc | Ai | Chặn lỗi nào | Đề xuất |
| :-- | :-- | :-- | :-- |
| Mở Java, sửa quyết định D-76 | Cả nhóm | B-38, B-07 | Mở Java cho Spring Boot, Go và Dart giữ như cũ |
| Chốt repo demo, sửa tiêu chí Q-03 | Cả nhóm | B-31, B-38 | Chọn repo Java nhóm hiểu nhất. Thử `SGU-quan-ly-nha-hang` và `spring-petclinic`, chưa đo số file của 2 repo này |
| Chốt luật mới cho engine | Cả nhóm | B-35, B-36, B-37, B-39 | Theo mục **Cần sửa** của từng lỗi. B-39 thay quyết định D-07, D-73 và sửa D-55 |
| Trả lời Q-C, host chính | Cả nhóm | A-01 | Vercel, tắt workflow Cloud Run |
| PR nền: ghi 2 quyết định mới vào `00`, thêm hằng số còn thiếu vào `config.ts` | Luồng 5 | Mọi luồng | `PREFLIGHT_TIMEOUT_MS` thành 1500, thêm `PREFLIGHT_PAGE_TIMEOUT_MS`, `LLM_RETRY_DELAY_MAX_MS`, `HISTORY_MISSED_POINTS_MAX`, `GRADE_REFERENCED_MAX` theo `02` |

Quyết định mới lấy số từ D-80. Luật chưa chốt thì bỏ qua lỗi đó, làm lỗi kế tiếp trong luồng.

### Chia luồng

| Luồng | Người | Giữ file | Mã lỗi |
| :-- | :-- | :-- | :-- |
| 1. Engine đồ thị | Minh | `graph/symbols.ts`, `callgraph.ts`, `slicing.ts`, `nodes.ts`, `complexity.ts`, `layout.ts`, `graph/index.ts` | B-01, B-02, B-03, B-04, B-05, B-06, B-11, B-20, B-27, B-28, B-33, B-34, B-35, B-36, B-37, B-39 |
| 2. Ingest | Phat107 | `src/server/engine/ingest/*`, `resolvers/ts_js.ts`, `graph/naming.ts` | B-14, B-15, B-16, B-17, B-18, B-19, B-21, B-22, B-23, B-24, B-25, B-26, B-29, B-30, B-32 |
| 3. Java | Lê Ngọc Quý | `graph/registry.ts`, `graph/parser.ts`, `resolvers/java.ts`, `queries/java.scm`, `public/grammars/` | B-07, B-12, B-31, B-38 |
| 4. AI | Huynh Nhan | `src/server/ai/*`, `review/loi_da_gap.md` | C-01, C-02, C-03, C-04, C-05, C-06, C-07, C-08, C-09 |
| 5. Tích hợp | Thiện | `src/contracts/*`, `src/server/errors.ts`, `src/app/api/*`, `.github/workflows/*`, test tích hợp | A-01, A-02, A-03, A-04, A-05, A-07, B-13 |

### Thứ tự trong từng luồng

Làm từ trên xuống. Cột **Chờ** rỗng thì làm được ngay sau Bước 0.

**Luồng 1 · Engine đồ thị**

| Bước | Mã | Việc | Chờ |
| --: | :-- | :-- | :-- |
| 1 | B-01 | Lấy commit `1066d4d`, không làm lại | |
| 2 | B-03, B-34, B-02, B-20 | Nhận route đúng, bỏ file test và mock | Bước 1 |
| 3 | B-27, B-35 | Bỏ `<module>` và component giao diện khỏi bài thuật toán | Luật B-35 |
| 4 | B-37, B-06 | Đo trước bước nào bị bỏ, rồi sửa lát cắt và Prisma | Luật B-37 |
| 5 | B-11, B-28 | Bỏ bước rỗng, dựng lại `snippet_line_map` | Bước 3 |
| | | **Đổi `ENGINE_VERSION` thành `1.7.0`, báo cả nhóm** | Bước 1–5 |
| 6 | B-36 | Sửa luật cắt còn 20 bài | Luật B-36 |
| 7 | B-39, B-04, B-05 | Nối bài theo phụ thuộc dữ liệu. Không nối theo module, đo lại B-04, B-05 sau khi xong | Bước 4, 6, luật B-39 |
| 8 | B-33 | Tăng tốc `buildSlice` | Bước 7 |

**Luồng 2 · Ingest**

| Bước | Mã | Việc | Chờ |
| --: | :-- | :-- | :-- |
| 1 | B-14 | Thăm dò GitHub theo `10` | PR nền |
| 2 | B-22 | Che secret, phần server | |
| 3 | B-25, B-26 | Parser JSONC dùng chung, đọc alias `@/` | |
| 4 | B-17 | Monorepo chọn nhầm gói | |
| 5 | B-16, B-23, B-24 | `ref_label`, đọc gói, ngôn ngữ `.vue` | |
| 6 | B-15, B-21 | Hoa thường ở link và thư mục | |
| 7 | B-32 | Tải manifest song song | Luồng 1 xong bước 2, vì cùng sửa `selective.ts` |
| 8 | B-18, B-19 | Zip độc, zip macOS | |
| 9 | B-29, B-30 | Tên bước, tên bài. Đổi tên là đổi id, nên vào `1.8.0` | Mốc 1 |
| 10 | B-34 | Phần còn lại: framework lấy từ `devDependencies`, tên bài có `<`, `>` | Bước 9 |

**Luồng 3 · Java**

| Bước | Mã | Việc | Chờ |
| --: | :-- | :-- | :-- |
| 1 | B-12 | Báo lỗi khi thiếu query, cần trước khi thêm query Java | |
| 2 | B-07 | Go, Dart vào `KNOWN_NO_GRAMMAR`, báo đúng ngôn ngữ | Quyết định Java |
| 3 | B-38 bước 2–3 | Grammar, query, adapter, đọc class, method, import, `resolvers/java.ts` | Luồng 1 xong bước 1, vì cùng đụng `symbols.ts` |
| 4 | B-38 bước 4–5 | Route Spring, tầng, JPA, `@ManyToOne` cho B-39. Viết trong file riêng, chỉ thêm lời gọi vào `callgraph.ts`, `slicing.ts` | Mốc 1 |
| 5 | B-31, B-38 bước 6–7 | Repo mẫu Spring trong test, ngưỡng repo demo, gói Offline | Bước 4 |

**Luồng 4 · AI**

| Bước | Mã | Việc | Chờ |
| --: | :-- | :-- | :-- |
| 1 | C-01, C-05 | Log lỗi Gemini, gọi lại theo `retryDelay` | PR nền |
| 2 | C-08 | Code D-74: gợi ý theo bậc, nhớ lượt trước, nhớ ý đã hụt, tra tên | PR nền |
| 3 | C-06, C-09 | Ghi log điểm dở bị lọc | |
| 4 | C-03, C-04, C-07 | Sửa prompt câu hỏi và tóm tắt | |
| 5 | C-06, C-09, C-02 | Chạy AI thật trên lát cắt mới, đếm bản thô và bản qua cổng gác, sửa prompt nếu cần | Mốc 1 |
| 6 | | Đổi `PROMPT_VERSION` một lần, chạy lại các ca trong `review/loi_da_gap.md` | Bước 5 |

**Luồng 5 · Tích hợp**

| Bước | Mã | Việc | Chờ |
| --: | :-- | :-- | :-- |
| 1 | | PR nền ở Bước 0 | |
| 2 | A-02 | Log lỗi lạ an toàn | |
| 3 | A-04, B-13 | Kiểm biến AI và nạp grammar lúc khởi động, thêm `instrumentation.ts` | |
| 4 | A-05 | Trả `analyses` khi mở lại phiên | |
| 5 | A-07 | Dựng Postgres test, chuyển `flow.test.ts` về `main` | |
| 6 | A-01 | Làm theo Q-C | Q-C |
| 7 | A-03 | Không sửa theo phỏng đoán. Gặp lại thì lưu request và phản hồi | |

Luồng 5 đồng thời duyệt và merge PR của cả nhóm.

### Mốc trong ngày

| Giờ | Mốc | Đạt khi |
| :-- | :-- | :-- |
| 13:00 | Bước 0 | Quyết định đã ghi, PR nền đã merge |
| 16:30 | Mốc 1, engine `1.7.0` | Luồng 1 xong bước 5. Quét repo demo và BrewLite không còn bài từ file test, route giả, bài `<module>`, bài API đi tới phần xử lý chính |
| 19:00 | Mốc Java | Repo demo Java ra bài theo route, có bài đi đủ controller, service, repository |
| 21:00 | Mốc 2, engine `1.8.0` | Luồng 1, 2, 3 xong, bản đồ nối theo chức năng, tên bài đọc được |
| 22:00 | Đóng băng backend | Luồng 4, 5 xong. `npm run typecheck`, `npm run lint`, `npm test` xanh. Chạy online trọn một bài: đăng nhập, quét repo, phân tích, trả lời sai, nhận gợi ý, trả lời đúng, kiểm BKT |
| Sau 22:00 | Sang giao diện | Ghép frontend `feat/giao-dien-ide`, sửa lỗi Vai D |

**Nếu 19:00 Java chưa đạt:** dừng B-38, giữ phần đã làm ở nhánh riêng, dùng lại BrewLite làm repo demo. Luồng 3 chuyển sang B-31 cho BrewLite.

### Luật tránh đụng nhau

- Mỗi nhóm lỗi một nhánh nhỏ từ `main`, ví dụ `b/fix-...`, xong là mở PR ngay. Không gom cả buổi vào một PR.
- Chỉ sửa file luồng mình giữ. Cần sửa file luồng khác thì nhắn người giữ file.
- `config.ts` chỉ Luồng 5 sửa, trừ 2 dòng: Luồng 1 đổi `ENGINE_VERSION`, Luồng 4 đổi `PROMPT_VERSION`.
- Sửa đổi đồ thị thì chưa đổi `ENGINE_VERSION`. Chỉ đổi ở 2 mốc `1.7.0`, `1.8.0` theo Q-F, Java vào `1.8.0`.
- Mỗi PR chỉ đổi **Trạng thái** của lỗi trong PR đó, không sửa bảng khác của file này.
- Mọi lỗi vẫn theo [Sửa một lỗi](#3-sửa-một-lỗi): spec trước, test thất bại trước, kiểm trên repo thật.

### Nếu trễ thì bỏ trước

Sau 21:00 mà chưa làm tới thì để lại, theo thứ tự: B-33, B-18, B-19, B-32, B-15, B-21, B-23, B-24, B-28. Các lỗi này không ảnh hưởng buổi demo, hoặc chưa ảnh hưởng nhiều tới người học.

Không bỏ: B-01, B-02, B-03, B-06, B-27, B-37, B-39, B-22, C-05, C-06, C-08, C-09.
