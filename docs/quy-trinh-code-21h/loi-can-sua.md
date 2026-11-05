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

Mã mới lấy số kế tiếp của vai, không dùng lại mã đã bỏ (`D-02`, `A-06`). Hiện kế tiếp là `B-35`, `D-16`, `C-07`, `A-07`.

```markdown
### B-35 · Nặng | Vừa | Nhẹ · Tên ngắn

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
| B — Engine | 3 | 15 | 15 | 33 |
| D — Giao diện | 2 | 6 | 6 | 14 |
| C — AI | 0 | 6 | 0 | 6 |
| A — Tích hợp, deploy | 0 | 3 | 2 | 5 |
| **Tổng** | **5** | **30** | **23** | **58** |

Vai B có 33 mã, gộp thành 23 nhóm sửa, xem mục **Vai B theo phiếu**.

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
| B05 | B-03 + B-34 | Nhận nhầm route: `config.get`, `msw` | Code | `graph/callgraph.ts` (TASK_20) | Có với B-03 | Hết: route giả BrewLite 2 → 0, `bulletproof-react` 13 → 0. Luật handler phải vẫn nhận `const h = makeHandler(cfg)`, bản thử chặn nhầm nên 1 test đỏ |
| B05 | B-25 + B-26 | Đọc tsconfig sai, mất alias `@/` | Code | `graph/resolvers/ts_js.ts`, `ingest/fingerprint.ts` | Có khi chọn `frontend/` | Một phần: BrewLite 147 → 0, `taxonomy` 274 → 43, `full-stack-fastapi-template` 248 → 201. Phần còn lại chưa rõ nguyên nhân |
| B06 | B-06 | Prisma không tới tầng dữ liệu | Code | `graph/slicing.ts` | Có | Hết: BrewLite 0/19 → 14/17 |
| B06 | B-33 | Engine chậm khi nhiều route | Code | `graph/slicing.ts` | Không | Một phần: `django/django` 121 → 32 giây, còn chỗ chậm khác |
| B07 | B-02 + B-20 | File test thành bài học | Spec | ING-87, `graph/nodes.ts`, `ingest/priority.ts` (TASK_20) | Có | Hết: file test BrewLite 1 → 0, `nestjs/nest` 12 → 0 |
| B07 | B-04 + B-05 | Bài rời rạc, mở sẵn quá nhiều | Spec | D-07, D-55, `graph/nodes.ts` (TASK_21) | Có | Chưa thử |
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
- **Trạng thái:** đã xác nhận trên site. Bản sửa ở nhánh `b/fix-nest-buoc-dau`, commit `1066d4d`, đã qua test, chưa vào `main`.

### B-02 · Nặng · Capstone lấy từ file test

- **Hiện tượng:** BrewLite có Capstone `Order` từ `order-state-machine.spec.ts`. Repo demo có `user.service.spec.ts` (E06-12).
- **Nguyên nhân:** ING-87 chỉ giảm ưu tiên file test, không loại khỏi node.
- **Cần sửa:** trong `nodes.ts`, còn từ `DISPLAY_MIN_NODES` candidate không mang cờ test thì bỏ candidate mang cờ. `isTestPath` trong `selective.ts` chưa export và `priority.ts` có bản logic riêng, nên gom về một hàm dùng chung rồi mới dùng lại.
- **Kiểm tra:** Capstone BrewLite là `Create Order`, không còn node từ `.spec`.
- **Trạng thái:** đã xác nhận trên site, chưa làm (TASK_20).

### B-03 · Vừa · `config.get()` thành route giả

- **Hiện tượng:** BrewLite có bài `List Jwt_expires_ins` và `Charge`.
- **Nguyên nhân:** `callgraph.ts` nhận route theo tên `get` và số đối số, không xét đối số cuối có phải handler không.
- **Cần sửa:** làm cả hai điều kiện, vì chỉ xét đối số cuối thì `cache.get('k', loadFn)` vẫn thành route.
  1. Đối số cuối phải là hàm, lời gọi bọc, hoặc tên tham chiếu tới hàm. Chuỗi, số, boolean, object, tên hằng thì không tạo route.
  2. Receiver phải có nguồn từ `express()`, `Router()` theo `12` Mục 1. Code hiện chưa kiểm điều này.
- **Kiểm tra:** BrewLite không còn 2 bài trên và vẫn đủ 17 route thật. Có test `cache.get('k', loadFn)` không sinh route.
- **Trạng thái:** đã xác nhận trên site, chưa làm (TASK_20).

### B-04 · Vừa · Quá nhiều bài mở sẵn

- **Hiện tượng:** BrewLite mở 13/20 bài, `nestjs/nest` mở 19/20 ngay từ đầu.
- **Nguyên nhân:** quyết định D-07 chỉ nối bài gọi chung hàm, nên nhiều bài không có bài cha.
- **Cần sửa:** thêm `addTreeEdges` trong `nodes.ts`, nối bài theo module thành cây, cạnh thêm là `INFERRED` và có khóa bài (đề xuất D-73).
- **Kiểm tra:** BrewLite mở lúc đầu không quá 6 bài.
- **Trạng thái:** đã xác nhận trên site, chờ quyết Q-B (TASK_21). Đổi cách khóa bài nên cần thử kỹ trước khi demo.

### B-05 · Vừa · Node tách rời, bản đồ quá dài

- **Hiện tượng:** BrewLite có 9 node không nối với bài nào, hàng đầu có 13 bài.
- **Nguyên nhân:** như B-04, cộng quyết định D-55 đưa mọi bài không có cha lên hàng đầu.
- **Cần sửa:** làm cùng B-04, rồi đo lại. Bản đồ chỉ đọc được khi đã sửa thêm lỗi D-01.
- **Kiểm tra:** BrewLite hết node lẻ, còn khoảng 3 cây (theo mô phỏng).
- **Trạng thái:** đã xác nhận trên site, chờ quyết Q-B (TASK_21).

### B-06 · Vừa · Không có luồng tới tầng dữ liệu

- **Hiện tượng:** BrewLite có 0/20 bài chứa bước `DATA_ACCESS`, dù có 51 lời gọi `this.prisma...`. Repo dùng TypeORM hay Mongoose vẫn có: `nestjs-realworld` 19/20, `node-express-boilerplate` 12/17.
- **Nguyên nhân:** `isDataSinkCall` trong `slicing.ts` xét phần cuối của receiver, với `this.prisma.order.create` là `order`, không khớp mẫu. Nhánh `prisma.` dùng `startsWith` nên `this.prisma...` không khớp. `tx.order.create` trong transaction cũng bị sót. ENG-82 trong spec 11 viết mẫu `prisma.` nên spec cũng thiếu.
- **Hậu quả:** không chỉ thiếu nhãn. ENG-81 và criterion đều dựa vào `DATA_SINK`, nên lát cắt có thể bỏ sót bước và chọn sai dòng trọng tâm.
- **Cần sửa:** bỏ `this.` rồi xét mọi đoạn của receiver có `prisma`, `tx`, `trx`. Không nới regex receiver chung, vì `client` đã khớp cả `httpClient.get`. Ghi rõ luật `prisma.` trong spec 11 Mục 8. Đổi `ENGINE_VERSION`.
- **Kiểm tra:** bước gọi Prisma có nhãn `DATA_ACCESS`, các bài BrewLite có gọi Prisma đều tới tầng dữ liệu.
- **Ảnh hưởng demo:** có.
- **Trạng thái:** đã chạy thật trên BrewLite, chưa làm.

### B-07 · Nặng · Repo Java, Go, Dart bị báo sai hoặc phân tích sai

- **Hiện tượng:** `huynhthanhnhannnh-pixel/SGU-quan-ly-nha-hang` báo `no_code`, `spring-petclinic` báo `only_manifests`, dù đều có code Java. `gin-gonic/examples` (Go) ra 13 node với ngôn ngữ `JAVASCRIPT`, `flutter/samples` (Dart) ra 2 node với ngôn ngữ `PYTHON`.
- **Nguyên nhân:** spec 11 Mục 1 có 7 ngôn ngữ `RESOLVED` và 9 `STRUCTURAL`, nhưng `LANGUAGE_REGISTRY` chỉ có 4. `.java`, `.go`, `.dart` cũng không nằm trong `KNOWN_NO_GRAMMAR`, nên engine coi như không có code và `ERR_UNSUPPORTED_LANGUAGE` không chạy. Điểm 10 trong README Vai B ghi việc này từ trước nhưng chưa ai chốt.
- **Cần sửa:** tối thiểu, nhận các đuôi spec có nhưng chưa có grammar: repo chủ yếu ngôn ngữ đó thì trả `ERR_UNSUPPORTED_LANGUAGE`, repo trộn thì cảnh báo chỉ phân tích một phần. Muốn hỗ trợ thật thì thêm phiếu B11 cho grammar và resolver. Sửa spec cho khớp phạm vi đã chốt, theo việc S-05.
- **Kiểm tra:** 4 repo trên báo đúng ngôn ngữ, không còn `no_code`, không gọi repo Go là `JAVASCRIPT`.
- **Trạng thái:** đã chạy thật trên engine, chưa làm.

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
- **Trạng thái:** đã xác nhận trên site, chưa làm.

### B-12 · Nhẹ · Lỗi nạp query bị bỏ qua

- **Hiện tượng:** `catch` trong `loadAll` ở `parser.ts` nuốt lỗi khi nạp file `.scm`. Nếu query hỏng, engine vẫn chạy nhưng có thể mất symbol mà không báo gì. Hiện 4 query đều nạp được.
- **Cần sửa:** ngôn ngữ `RESOLVED` thiếu query thì báo lỗi, thêm test `getQuery` khác `null`.
- **Trạng thái:** chưa làm.

### B-13 · Nhẹ · Grammar chưa nạp lúc khởi động

- **Hiện tượng:** spec ghi `initParsers` chạy 1 lần khi server khởi động, code gọi lúc `parseAll`, nên request đầu chậm hơn.
- **Cần sửa:** gọi ở bước khởi động, làm cùng A-04.
- **Trạng thái:** chưa làm.

### B-14 · Vừa · Thăm dò GitHub dễ hết giờ với repo mới

- **Hiện tượng:** trong 7 repo đo lần lượt, cả 7 đều hết giờ ở lần gọi đầu rồi mới thử lại, nên mỗi repo mất thêm khoảng 1,3 giây. `gothinkster/vue-realworld-example-app` hỏng cả 2 lần và báo `ERR_NETWORK_TIMEOUT`, ở lượt đo trước `facebook/react` và `calcom/cal.com` cũng vậy, dù repo bình thường. Gọi lại cùng repo thì chỉ còn 110–210ms.
- **Nguyên nhân:** `PREFLIGHT_TIMEOUT_MS` chỉ 300ms, còn lần gọi đầu tới mỗi repo thường lâu hơn. Việc này xảy ra với từng repo mới trong cùng một tiến trình, nên không chỉ do server khởi động lạnh. Chưa rõ phần chậm nằm ở đâu phía GitHub.
- **Cần sửa:** đo trên Vercel rồi tăng trần, ví dụ 1000–1500ms. Đây là `src/contracts/config.ts`, cần báo Vai A và sửa spec.
- **Kiểm tra:** dán repo chưa dùng lần nào, không phải chờ thử lại và không báo `ERR_NETWORK_TIMEOUT`.
- **Trạng thái:** đã đo ở máy local, chưa đo trên Vercel. Vercel cũng bị thì nâng lên Nặng.

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
- **Trạng thái:** đã chạy thật, chưa làm.

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
- **Cần sửa:** thêm các segment này vào ING-87 và `priority.ts`, làm cùng TASK_20 vì task đó dùng chung cờ test.
- **Kiểm tra:** `nestjs/nest` không còn node từ `integration/`.
- **Trạng thái:** đã chạy thật, chưa làm.

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
- **Trạng thái:** đã chạy thật, chưa làm.

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
- **Trạng thái:** đã chạy thật, chưa làm. Lỗi cùng kiểu ở trình đọc alias ghi tại B-26.

### B-26 · Vừa · Không đọc được alias `@/` nên mất cạnh gọi hàm

- **Hiện tượng:** mọi import `@/...` bị coi là thư viện ngoài: BrewLite 147/147, `shadcn-ui/taxonomy` 274/274, `fastapi/full-stack-fastapi-template` 248/248. Khi chọn `frontend/` của BrewLite, 7/8 bài không có cạnh gọi nào. `taxonomy` có 222 hàm nhưng chỉ 15 cạnh, 14/20 bài không có cạnh.
- **Nguyên nhân:** có 2 chỗ trong `parseTsConfig` ở `resolvers/ts_js.ts`. (1) Chỉ đọc `tsconfig.json` ở gốc repo, nên `frontend/tsconfig.json` bị bỏ qua. (2) Xóa comment không phân biệt chuỗi: `"@/*"` và `"**/*.ts"` bị coi là comment, nên tsconfig mặc định của Next.js parse lỗi. `catch` nuốt lỗi nên không có cảnh báo.
- **Cần sửa:** tìm tsconfig gần file đang xét nhất và tính `paths` theo thư mục đó. Dùng chung parser JSONC với B-25.
- **Kiểm tra:** 3 repo trên không còn `@/...` trong external, `frontend/` của BrewLite có cạnh gọi.
- **Ảnh hưởng demo:** không ảnh hưởng `backend/` của BrewLite. Có ảnh hưởng khi đổi sang `frontend/`.
- **Trạng thái:** đã chạy thật, chưa làm.

### B-27 · Vừa · Bài học lấy cả `<module>` làm thuật toán

- **Hiện tượng:** BrewLite có bài `Order` với 3 bước đều là `<module>` của file test. `node-express-realworld` có bài `:slug / Article` với `<module>` của `article.controller.ts`, đoạn bỏ qua tới 214 dòng. Cả 2 repo này và `node-express-boilerplate` đều có Capstone là node `<module>`. `pallets/click` có nhiều bài `<module>` tương tự.
- **Nguyên nhân:** code cấp cao nhất được coi là hàm `<module>`, gồm cả các handler ẩn danh, nên độ phức tạp cộng dồn rất cao. `pickVipFunctions` không loại nó nên thành bài `ALGORITHMIC_CORE`.
- **Cần sửa:** loại `<module>` khỏi chọn VIP và ENG-90, trừ chế độ `PROCEDURAL`. Liên quan B-02 và B-11: TASK_20 chỉ bỏ được file test, không bỏ được trường hợp này.
- **Kiểm tra:** không còn node `ALGORITHMIC_CORE` có `function_name` là `<module>`.
- **Ảnh hưởng demo:** có.
- **Trạng thái:** đã chạy thật, chưa làm.

### B-28 · Nhẹ · Dòng "bỏ qua" của bài thuật toán có số dòng thật

- **Hiện tượng:** dòng `// … (24 dòng)` có `snippet_line_map` khác 0, đo được 8 dòng trên 6 repo. Spec yêu cầu marker có map bằng 0.
- **Nguyên nhân:** phần cắt bước trong `nodes.ts` (quanh dòng 288) chèn marker rồi chỉ cắt mảng map, không dựng lại. Các dòng sau marker cũng có thể lệch số.
- **Cần sửa:** dựng lại `snippet_line_map` khi chèn marker.
- **Trạng thái:** đã chạy thật, chưa làm.

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
- **Nguyên nhân:** spec 12 Mục 1 yêu cầu `R` phải đến từ `express()`, `Router()` hoặc `fastify()`, nhưng `callgraph.ts` chỉ xét tên method. Luật handler của TASK_20 không chặn được ca này vì đối số cuối đúng là hàm. Framework Express đến từ `express` trong `devDependencies` (liên quan B-09). URL dạng template làm path rỗng, nên tên bài rơi về `<anon@l111>`.
- **Cần sửa:** kiểm nguồn gốc của `R`, làm cùng TASK_20. Bỏ file mock theo ING-87 (`mocks`, `__mocks__`), và không cho tên bài chứa `<`, `>`.
- **Kiểm tra:** repo trên không còn route từ `msw`.
- **Ảnh hưởng demo:** không có với BrewLite.
- **Trạng thái:** đã chạy thật, chưa làm.

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
- **Trạng thái:** chưa làm.

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
- **Trạng thái:** chưa làm.

### C-06 · Vừa · Điểm dở luôn rỗng

- **Hiện tượng:** cùng lần đo, 24/24 lần phân tích (12 bài, cả lời gọi AI và agent) có `weak_points` rỗng, kể cả bản agent không qua cổng gác. Đo thêm repo `gothinkster/node-express-realworld-example-app` cùng ngày: 7 lần phân tích thành công (5 bản qua cổng gác, 2 bản JSON thô chưa qua cổng gác) đều có `weak_points` rỗng; các lần còn lại bị Google trả 503. Chạy lại lần 2 (giãn 8 giây): 3 bản JSON thô thì 1 bản có điểm dở hợp lý (bài Create Article: service nhận tham số `any`, không có schema validation), nhưng lần `analyzeNode` riêng của bài đó trả `null` sau 2 request, chưa rõ do cổng gác hay 503; 8 bản qua cổng gác đều rỗng.
- **Nguyên nhân:** nghi chủ yếu do prompt hoặc model (bản thô chưa qua gác cũng gần như luôn rỗng); chưa loại trừ cổng gác chặn bớt, cần ghi lý do chặn để biết. Prompt `analyze-node` có câu "Không chắc thì mảng rỗng — không bịa lỗi cho có", nghi model nhỏ hiểu quá chặt.
- **Cần sửa:** chạy thêm 1–2 repo khác. Nếu vẫn rỗng thì sửa prompt `analyze-node` và đổi `PROMPT_VERSION`.
- **Kiểm tra:** repo demo có ít nhất 1 bài có điểm dở hợp lý, qua duyệt tay.
- **Trạng thái:** cần xác minh.

---

## Vai A — Tích hợp, deploy

### A-01 · Vừa · Workflow Cloud Run luôn thất bại

- **Hiện tượng:** `deploy` thất bại 6 lần gần nhất vì thiếu xác thực GCP. Site Vercel không bị ảnh hưởng.
- **Cần sửa:** đặt secret theo `deploy.yml`, hoặc tắt workflow nếu nhóm chỉ dùng Vercel.
- **Trạng thái:** đã xác nhận, chờ quyết Q-C.

### A-02 · Vừa · Lỗi thật bị che

- **Hiện tượng:** `toErrorResponse` đổi lỗi lạ thành `ERR_PERSISTENCE_UNAVAILABLE`, log chỉ có tên lỗi.
- **Cần sửa:** ghi thêm thông tin an toàn để tìm lỗi trong `src/server/errors.ts`.
- **Trạng thái:** chưa làm.

### A-03 · Vừa · Lỗi 401 chưa rõ nguyên nhân

- **Hiện tượng:** từng gặp "Phiên đăng nhập đã hết hạn", sau đó đăng nhập lại thì hết.
- **Cần sửa:** gặp lại thì lưu request và phản hồi ở tab Network để tìm nguyên nhân.
- **Trạng thái:** chưa tái hiện được.

### A-04 · Nhẹ · Chưa kiểm biến AI lúc khởi động

- **Hiện tượng:** `assertGeminiEnv` chỉ chạy khi gọi Gemini.
- **Cần sửa:** gọi ở bước khởi động, ví dụ `instrumentation.ts`.
- **Trạng thái:** chưa làm.

### A-05 · Nhẹ · A06 chưa trả `analyses`

- **Hiện tượng:** `src/app/api/ingest/route.ts` còn `analyses: {}`.
- **Cần sửa:** trả phân tích có sẵn khi mở lại phiên theo `03` Mục 6.6.
- **Trạng thái:** chưa làm.

---

## Quy trình cho agent

Làm từ trên xuống. Đang là bản tập dượt, nên mọi luật trong `CLAUDE.md` và `AGENTS.md` vẫn áp dụng.

### 1. Chuẩn bị

1. Đọc toàn bộ file này, kể cả lỗi mới được thêm.
2. Chạy `git status` và `git pull`. Nhánh `b/fix-nest-buoc-dau` (commit `1066d4d`) có bản sửa B-01: merge vào `main` trước, không làm lại.
3. Chọn lỗi theo [Thứ tự nên sửa](#thứ-tự-nên-sửa). Lỗi mới chưa có trong danh sách đó thì làm Nặng, rồi Vừa, rồi Nhẹ.

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
6. **Kiểm:** chạy `npm run typecheck`, `npm run lint`, `npm test`. Đổi contract thì chạy thêm `node .kb/tools/kiem-contracts.mjs`. Làm đúng mục **Kiểm tra** của lỗi, trên repo thật nếu lỗi ghi vậy.
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

Các file ở `docs/spec/`. Trạng thái chung: chưa làm. Mọi việc phải sửa cả ca test của file đó khi có.

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

Các file ở `docs/quy-trinh-code-21h/`. Trạng thái chung: chưa làm. Trước khi thêm ô, xem phiếu đã có ý đó chưa. Không tự sửa `phieu-can-co.md`, vì file này do công cụ sinh ra.

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
| Q-B | Có thêm quyết định D-73, nối bài thành cây theo module không? | Có, nhưng phải thử kỹ khóa bài | B-04, B-05, S-13 | chờ quyết |
| Q-C | Host chính của vòng 2 là Cloud Run hay Vercel? | Vercel, tắt workflow Cloud Run, vì GCP còn thiếu secret | A-01, S-11 | chờ quyết |
| Q-D | Spec 30 theo giao diện thật hay đổi code về 3 cột? | Viết lại spec theo giao diện thật | S-07 | chờ quyết |
| Q-E | 6 file spec đã vượt trần byte: nâng trần hay cắt bớt? | Nâng trần cho `02`, `10`, `20`, `21`, `30`, ghi một quyết định, cắt `00` | Việc spec có cột Chờ là Q-E | nâng trần, quyết định D-75 |
| Q-F | Có nâng `ENGINE_VERSION` lên `1.7.0` và gom các đổi engine vào một lần không? | Có | Bước đổi phiên bản của B-01 … B-07 | chờ quyết |

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
