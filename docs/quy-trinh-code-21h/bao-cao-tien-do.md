# Báo cáo tiến độ quy trình code 21 giờ

Ngày kiểm: 04/11/2026 · Mốc kiểm: commit `9a9e151` của `main` · Bộ phiếu: 52 phiếu của 5 vai

## Cập nhật sau báo cáo (04/11/2026)

Số liệu các mục dưới vẫn là của mốc `9a9e151`. Các thay đổi sau chưa được chấm lại toàn bộ:

- **Vai A:** 2 lỗi 503 đã được sửa ở PR #117, #118, kèm test trên Postgres thật. Chưa kiểm lại độc lập.
- **Vai B:** đã sửa B04–B08, B10 ở chuỗi PR #113 → #114 → #115 → #120 → #121 → #122, phải merge đúng thứ tự, đang chờ Vai A. Nghiệm thu 7 repo đạt 20/20 điều kiện, 635 test xanh.
- **Vai E:** E07, E08 đã có PR #116, #119.

| Repo | Luồng từ 2 bước | Tới `DATA_ACCESS` | Trước khi sửa |
| :-- | :-: | :-: | :-- |
| `hagopj13/node-express-boilerplate` | 13/14 | 12 | 0, 0 |
| `gothinkster/node-express-realworld-example-app` | 19/19 | 11 | 19, 8, có 3 màn hình giả, nay 0 |
| `lujakob/nestjs-realworld-example-app` | 19/20 | 19 | Không đổi |
| `fastapi/full-stack-fastapi-template` | 10/20 | 8 | 0, 0, sai kiểu dự án, nay đúng |
| `pallets/flask` | 6/7 | 6 | Không đổi |
| `obytes/react-native-template-obytes` | 2/8 | 0 | 1/8 màn hình, nay 8/8 |

**Cần Vai D, E biết:** bản đồ `shop-api` đổi thành N6→N5, N7→N5, vì sơ đồ cũ N5→N6, N5→N7 trái D-07 và D-12. `spec/50`, `shop-api.json`, `KICH_BAN_DEMO.md` và các tài liệu liên quan cần sửa theo.

## 1. Tóm tắt

**22/52 phiếu đạt, và luồng chính hiện chưa chạy được trên database thật.** Test đều xanh vì test giả lập database. Còn 5 việc lớn:

1. **`ingest` và chấm bài đều trả 503 trên Postgres thật.** Đây là 2 lỗi chặn đường, xem Mục 4 phần Vai A. Vá 2 lỗi này thì cả luồng học chạy được.
2. **Chưa deploy được.** 30 lần chạy `deploy` gần nhất đều đỏ do repo chưa có Secrets GCP.
3. **Giao diện lệch spec.** Code chưa dùng ReactFlow và Monaco như [`spec/30_UI.md`](../spec/30_UI.md) yêu cầu, và offline chỉ chạy được một đường.
4. **Engine yếu trên repo thật.** Nhiều lát cắt dừng ở controller, xem Mục 4 phần Vai B.
5. **Chưa có dữ liệu demo thật.** Bundle offline không ghi từ API, và E06–E10 chưa có kết quả nào.

| Vai | Đạt | Đạt một phần | Chưa làm | Không kiểm được | Tổng |
| :-- | :-: | :-: | :-: | :-: | :-: |
| [A — Trưởng tích hợp](vai-A/README.md) | 5 | 7 | 0 | 0 | 12 |
| [B — Engine](vai-B/README.md) | 4 | 6 | 0 | 0 | 10 |
| [C — AI + BKT](vai-C/README.md) | 8 | 2 | 0 | 0 | 10 |
| [D — Giao diện](vai-D/README.md) | 0 | 10 | 0 | 0 | 10 |
| [E — Kiểm thử, demo, slide](vai-E/README.md) | 5 | 0 | 5 | 0 | 10 |
| **Tổng** | **22** | **25** | **5** | **0** | **52** |

**Cách kiểm:** không chỉ dựa vào test có sẵn. Engine chạy trên 7 repo GitHub thật. API chạy trọn luồng trên Postgres thật (PGlite) với engine và cổng gác thật, chỉ giả đăng nhập và phản hồi Gemini. Giao diện chạy trên Chrome thật. Cổng gác được thử bằng đầu vào tự viết.

**Cách đọc các mức:**

- `ĐẠT`: đủ file, PR đã merge, mọi ô kiểm được bằng lệnh hoặc đọc code đều đạt. Các ô phải chạy tay với môi trường thật có thể chưa chạy, xem Mục 6.
- `ĐẠT MỘT PHẦN`: đã có code, nhưng thiếu file hoặc có ô chưa đạt.
- `CHƯA LÀM`: chưa có sản phẩm hay kết quả của phiếu.
- `KHÔNG KIỂM ĐƯỢC`: code đã có, nhưng phải có người chạy tay với môi trường thật mới kết luận được.

## 2. Tình trạng repo

| Hạng mục | Kết quả |
| :-- | :-- |
| `tsc` | 0 lỗi |
| `eslint` | 0 lỗi, 7 cảnh báo biến không dùng |
| `vitest` | 622 ca: 616 đạt, 0 đỏ, 6 `todo` (ngôn ngữ chưa có grammar, phiếu B10 cho phép) |
| `build` | Qua |
| CI `ci`, `security` | Xanh |
| CI `deploy` | **Đỏ**, dừng ở bước xác thực GCP |
| Luồng API trên Postgres thật | Migration chạy được. `ingest` và chấm bài 503. Vá tạm 2 lỗi thì trọn luồng chạy đúng |
| Chrome thật | 8 trang mở được. `Ctrl+Shift+D` chạy tới chấm bài, 0 request. `/learn?offline=1` ra trang trống |
| Gọi thử app ở máy | `/api/health` trả 200, `/api/me` không token trả 401 đúng mã, các trang chính trả 200 |

## 3. Các mốc lớn

| Mốc | Gồm | Tình trạng |
| :-- | :-- | :-- |
| Lát dọc 1 | A07, B07, C06, D06 | **Chưa thông:** `ingest` 503 chặn cả lát. A07, C06 đạt, B07, D06 còn lỗi |
| Lát dọc 2 | A10, C08, D08 | **Chưa thông:** chấm bài 503. C08 đạt, D08 còn lỗi và bundle chưa chuẩn |
| Staging | A03, A09, A12 | **Chưa có**, vì deploy đỏ |
| Duyệt AI và đóng băng bundle | E07, E08, C10 | **Chưa bắt đầu đúng quy trình** |
| Definition of Done, video, slide | E09, E10 | **Chưa làm** |

## 4. Tiến độ từng phiếu

### Vai A — Trưởng tích hợp

| Phiếu | Mức | Việc | Còn lại |
| :-- | :-- | :-- | :-- |
| A01 | ĐẠT MỘT PHẦN | Khung code repo thi | 5 gói trong `package.json` còn dấu `^`, do commit giao diện thêm vào sau |
| A02 | ĐẠT | Gõ contracts | Không |
| A03 | ĐẠT MỘT PHẦN | CI/CD, an ninh GitHub | `ci`, `security` xanh, `deploy` chưa chạy thành công (X-09) |
| A04 | ĐẠT | Database, auth, `/api/me` | Chạy migration trên Supabase thật |
| A05 | ĐẠT MỘT PHẦN | Phiên, cache RAM, quota | **Lỗi chặn:** ghi `graph_skeleton` bằng `${JSON.stringify(x)}::jsonb` nên vào DB thành chuỗi, làm `ingest` hỏng |
| A06 | ĐẠT MỘT PHẦN | Nối `/api/ingest` | **Mọi lần ingest mới trả 503** do lỗi ở A05. Mở lại phiên trả `analyses: {}`, chưa làm phần trả bản phân tích có sẵn |
| A07 | ĐẠT | Nối `/api/analyze-node` | Chạy đúng trên Postgres thật sau khi vá `ingest`, cache không tốn thêm lượt gọi |
| A08 | ĐẠT | Nối `/api/enrich-node` | Chạy đúng trên Postgres thật sau khi vá `ingest`, gọi lại trả đúng run cũ |
| A09 | ĐẠT MỘT PHẦN | Dockerfile | Chưa có bằng chứng chạy trên staging |
| A10 | ĐẠT MỘT PHẦN | Nối `/api/evaluate-feynman`, `/api/reveal` | **Lỗi chặn: mọi lần chấm bài trả 503**, vì `${pointsCovered}::boolean[]` bị Postgres từ chối. Vá xong thì chấm, BKT, mở khóa đều đúng. Đóng Issue #12 sau khi sửa |
| A11 | ĐẠT | Các API còn lại | `reveal`, `history`, `persona`, xóa tài khoản chạy đúng trên Postgres thật. Chưa chạy nhánh báo sai thành công. Đóng Issue #13 |
| A12 | ĐẠT MỘT PHẦN | Kiểm đủ endpoint, deploy | Đủ 14 endpoint trong code, nhưng chưa kiểm trên staging |

**Kết quả chạy API trên Postgres thật:**

| Bước | Kết quả |
| :-- | :-- |
| Migration, `/api/me`, xóa tài khoản | Đúng |
| `POST /api/ingest` | **503.** `JSON.stringify(x)` kèm `::jsonb` bị driver `postgres` mã hóa 2 lần, DB lưu chuỗi thay vì mảng, nên `getSessionProgress` lỗi `skeleton.filter is not a function` |
| `POST /api/evaluate-feynman` | **503.** `${pointsCovered}::boolean[]`: driver gửi tham số kiểu `boolean`, Postgres báo `cannot cast type boolean to boolean[]` |
| Sau khi vá tạm 2 lỗi | `ingest`, mở lại phiên, chặn truy cập chéo, cache, `enrich`, chấm trượt, chấm đạt, chặn nộp lại, `reveal`, kết thúc run, BKT, `overview`, `history`, `persona`, `restart` đều đúng |

Có 9 chỗ ghi `::jsonb` theo kiểu này (`session.ts`, `enrich.ts`, `progress.ts`, 2 route phân tích). Cách sửa gợi ý: dùng `sql.json(x)` hoặc `::text::jsonb`, và `sql.array` cho mảng. Lần vá tạm chỉ nằm trong bản kiểm thử, code trên `main` chưa đổi.

### Vai B — Engine

| Phiếu | Mức | Việc | Còn lại |
| :-- | :-- | :-- | :-- |
| B01 | ĐẠT | Thử giả định tải repo, nạp grammar | Không. Nạp grammar chạy tốt trên 7 repo thật |
| B02 | ĐẠT | Ingest 1: link, tải, phiên bản | Không. Tải được cả 7 repo thật |
| B03 | ĐẠT | Ingest 2: zip, phân loại, giải nén | Không. Lọc và giải nén chạy được trên 7 repo thật |
| B04 | ĐẠT MỘT PHẦN | Ingest 3: che secret, vân tay, `runIngest` | Repo FastAPI bị nhận sai là `ALGORITHM_CORE`, không ra framework. Regex đọc `pyproject.toml` gãy ở `fastapi[standard]` |
| B05 | ĐẠT MỘT PHẦN | Tầng 1: symbol, đồ thị gọi hàm | Chưa giải được `const { x } = require('../services')` và `crud.create_user` của Python, nên lát cắt dừng ở controller |
| B06 | ĐẠT MỘT PHẦN | Xếp hạng, độ phức tạp, lát cắt | Lát cắt `login` lẫn 2 dòng của hàm `register` đứng cạnh |
| B07 | ĐẠT MỘT PHẦN | Ghép node, bố cục, `runEngine` | Có node `App` với 0 bước, đưa lên bản đồ là không có gì để học |
| B08 | ĐẠT MỘT PHẦN | Sửa theo repo demo, tất định | Tất định đạt trên 7 repo, nhưng ô "lát cắt đi tới DATA_ACCESS" chỉ đạt trên `shop-api`. Repo thật hợp tiêu chí Q-03 thì 0/14 luồng tới được. Trên chính `shop-api`, quan hệ tiên quyết cũng khác sơ đồ `spec/50` Mục 1: Giỏ hàng, Gửi email, Báo cáo đều không có node cha |
| B09 | ĐẠT | Tải chọn lọc repo lớn | Test đạt, nhưng 7 repo đã chạy chưa repo nào kích hoạt tải chọn lọc |
| B10 | ĐẠT MỘT PHẦN | Python, entry main, React Native | Repo Expo chỉ ra 1/8 màn hình. Repo Express bị nhận nhầm 3 màn hình giả |

**Kết quả chạy `runEngine` trên repo GitHub công khai, mỗi repo 2 lần:**

| Repo | Kiểu | Node | Luồng tới `DATA_ACCESS` | Nhận xét |
| :-- | :-- | :-: | :-: | :-- |
| `lujakob/nestjs-realworld-example-app` | NestJS | 20 | 19/20 | Tốt |
| `pallets/flask` | Flask | 20 | 6/7 | Tốt ở phần `examples/tutorial` |
| `gothinkster/node-express-realworld-example-app` | Express TS | 20 | 8/19 | Có 3 node giả từ `src/app/routes/*.service.ts` |
| `hagopj13/node-express-boilerplate` | Express JS, 50 file | 17 | **0/14** | 0 cạnh, 13 luồng chỉ 1 bước, 1 node 0 bước |
| `fastapi/full-stack-fastapi-template` | FastAPI | 20 | **0/20** | 0 cạnh, mọi luồng chỉ 1 bước, nhận sai kiểu dự án |
| `expressjs/express` | Thư viện | 20 | 0/3 | 11 node lấy từ thư mục `test/` |
| `obytes/react-native-template-obytes` | Expo | 6 | 0/1 | Chỉ nhận màn hình `[...messing]` |

Điểm tốt: cả 7 repo chạy không lỗi, mỗi repo vài giây, và kết quả 2 lần giống hệt nhau khi bỏ số đo thời gian.

**Nguyên nhân đã thấy:**

- Route giả: `callgraph.ts` (điều kiện `isExpoScreen`) coi mọi file JS/TS dưới `/app/` là màn hình, không kiểm repo có gói `expo-router` hay không.
- Sai kiểu FastAPI: regex `[project].dependencies` dừng ở dấu `]` đầu tiên, tức `fastapi[standard]`, làm mất cả danh sách gói.
- Chưa rõ: vì sao Expo sót 7 màn hình, và vì sao `require` qua file `index` không giải được.

### Vai C — AI + BKT

| Phiếu | Mức | Việc | Còn lại |
| :-- | :-- | :-- | :-- |
| C01 | ĐẠT MỘT PHẦN | Đo Gemini, khung `gemini.ts` | Chưa đăng số đo độ trễ thật lên Issue #1 |
| C02 | ĐẠT | BKT | Không |
| C03 | ĐẠT | Kế hoạch câu hỏi, suy ra trạng thái | Không |
| C04 | ĐẠT | Hoàn thiện `gemini.ts`, prompt, schema | Không |
| C05 | ĐẠT | Cổng gác lõi | Không |
| C06 | ĐẠT | Lời gọi `analyze-node` | Không |
| C07 | ĐẠT | Đặt câu hỏi | Không |
| C08 | ĐẠT | Chấm và gợi ý | Không |
| C09 | ĐẠT | Tổng quan repo | Không |
| C10 | ĐẠT MỘT PHẦN | Duyệt tay, đóng băng bundle | Thiếu `scripts/record-bundle.ts`, chưa duyệt tay. **Bundle không phải ghi từ API:** 0/7 id khớp engine thật, cả 7 bài dùng chung một phân tích N+1. Phải ghi lại từ AI thật |

### Vai D — Giao diện

Code của cả vai vào `main` qua PR #109, chưa có PR theo từng phiếu, và Issue D01–D10 còn mở.

| Phiếu | Mức | Việc | Còn lại |
| :-- | :-- | :-- | :-- |
| D01 | ĐẠT MỘT PHẦN | Khung website, bộ UI | Ghim lại 5 gói có `^` |
| D02 | ĐẠT MỘT PHẦN | Store, client API, bảng lỗi | Thiếu test `workbench`, store `workbench.ts` chưa được dùng |
| D03 | ĐẠT MỘT PHẦN | Bản đồ bài học | **Chưa dùng ReactFlow**, thiếu các file `components/canvas/` |
| D04 | ĐẠT MỘT PHẦN | Khung xem code | **Chưa dùng Monaco**, thiếu `CodePane.tsx` |
| D05 | ĐẠT MỘT PHẦN | Phân tích X-Ray, Tổng quan | Thiếu `SkillChips.tsx`, `overview-view.ts`, chưa xác nhận đủ 3 giai đoạn D-71 |
| D06 | ĐẠT MỘT PHẦN | Trang chủ, đăng nhập, nối API | Trang lộ trình hiện id thô (`Kiến trúc Node: slice-cart`) thay vì tên bài. Luồng đăng nhập thật chưa chạy |
| D07 | ĐẠT MỘT PHẦN | Trả lời Feynman | Thiếu `RunSummary.tsx`. Khi chưa có câu hỏi thì hiện câu viết cứng về "trừ kho hàng" (`FeynmanQuestionSection.tsx:264`). Các ca T chưa chạy tay |
| D08 | ĐẠT MỘT PHẦN | Áp response, offline | `Ctrl+Shift+D` chạy được, không có request nào. Nhưng `/learn?offline=1` (link ở trang đăng nhập) ra trang trống và vẫn gọi server, vì bundle chỉ nạp khi bấm phím. Nội dung chờ bundle chuẩn từ C10 |
| D09 | ĐẠT MỘT PHẦN | Trang phụ, responsive | Ở màn 375px, `/` tràn ngang 49px, `/learn?offline=1` tràn 90px. `/report` hiện mã thô `ERR_UNAUTHENTICATED`. T12, T29 chưa chạy tay |
| D10 | ĐẠT MỘT PHẦN | Kiểm agent, sửa giao diện | Đã bỏ `/dev`, nhưng còn câu hỏi viết cứng ở D07. Chờ D03, D04, D05, D07 |

**Kết quả chạy trên Chrome thật (không đăng nhập):**

- `Ctrl+Shift+D` → lộ trình → bài học → trả lời → chấm: chạy được, 0 request `/api`.
- Bài Giỏ hàng lại hiện phân tích N+1 và câu hỏi về sản phẩm, vì bundle dùng chung nội dung cho cả 7 bài.
- Trong bundle, `slice-product-list` bị khóa dù theo spec N3 là điểm bắt đầu.

### Vai E — Kiểm thử, demo, slide

| Phiếu | Mức | Việc | Còn lại |
| :-- | :-- | :-- | :-- |
| E01 | ĐẠT | Issues, fixture `shop-api` | Không |
| E02 | ĐẠT | Fixture phản hồi AI | Không |
| E03 | ĐẠT | Từ cấm, bộ lọc an toàn | Không |
| E04 | ĐẠT | Regex tấn công, kiểm câu trả lời | Không |
| E05 | ĐẠT | Test kịch bản mức hàm | Không |
| E06 | CHƯA LÀM | Chạy repo demo trên engine thật | Chạy và ghi kết quả vào `review/loi_da_gap.md` |
| E07 | CHƯA LÀM | Script chạy duyệt, kịch bản A, B | Viết `scripts/review-run.ts`, chạy 2 kịch bản |
| E08 | CHƯA LÀM | Kịch bản trục trặc, kiểm xuyên module | Viết `src/__tests__/xuyen-module.test.ts`, chạy các ca, duyệt lần 1 |
| E09 | CHƯA LÀM | Definition of Done, offline, video | Chờ C10, D10 |
| E10 | CHƯA LÀM | Số đo, slide, nộp | Chờ E09 |

## 5. Việc cần làm tiếp, theo độ gấp

Mốc: 12:00 thứ Bảy 07/11/2026.

| # | Việc | Vai | Mở khóa |
| :-: | :-- | :-- | :-- |
| 1 | Sửa 2 lỗi chặn: 9 chỗ ghi `::jsonb` và `pointsCovered::boolean[]`. Thêm test chạy trên Postgres thật để không tái phát | A | A05, A06, A10, Lát dọc 1, 2 |
| 2 | Tạo Secrets GCP và Supabase, cho `deploy` xanh tới staging, chốt dùng Supabase nào cho production | A | A03, A09, A12 |
| 3 | Sửa engine: giải `require` qua `index`, gọi hàm qua module Python, kiểm gói `expo-router`, regex `pyproject.toml`, lát cắt lẫn hàm, node 0 bước, quan hệ tiên quyết của `shop-api` | B | B04–B08, B10 |
| 4 | Chạy tay luồng thật: đăng nhập, dán repo demo, phân tích, trả lời, chấm | E, D, A | E06, D06, A07 |
| 5 | Quyết định ReactFlow và Monaco: làm đúng spec, hay sửa spec và phiếu theo code | D, cả nhóm | D03, D04 |
| 6 | Sửa giao diện: nạp bundle cho `?offline=1`, tên bài thay id thô, bỏ câu hỏi viết cứng, tràn ngang trên điện thoại, chip kỹ năng, `RunSummary`, 3 giai đoạn Tổng quan, dùng hoặc bỏ `workbench.ts` | D | D02, D05–D10 |
| 7 | Viết `review-run.ts`, chạy kịch bản A, B và các ca trục trặc | E | E07, E08 |
| 8 | Viết `record-bundle.ts`, ghi lại bundle từ AI thật, đăng số đo Gemini | C | C01, C10, D08 |
| 9 | Chạy Definition of Done, quay video, điền số đo, làm slide | E | E09, E10 |
| 10 | Ghim 5 gói `^`, đóng Issue #13, xem lại `auth/callback` theo ghi chú PR #109 | A, D | A01, D01 |

5 PR Dependabot (#77–#81) còn mở, trong đó có các bản nâng lớn. Không nên merge trước giờ thi nếu chưa thử.

## 6. Giới hạn của báo cáo

- **Chưa chạy:** Gemini thật, Supabase thật, deploy, đăng nhập GitHub. Mức `ĐẠT` của Vai C nghĩa là luồng chạy đúng với fixture đi qua cổng gác thật, chưa biết chất lượng trả lời của Gemini.
- **PGlite là Postgres thật chạy trong tiến trình, không phải Supabase.** Hai lỗi chặn đã xác minh ở tầng driver `postgres`, nên nhiều khả năng xảy ra y hệt trên Supabase, nhưng chưa chạy trên Supabase. PGlite chỉ có 1 phiên nên chưa thử được nộp bài đồng thời.
- **Nhánh chưa chạy:** báo sai thành công, hết quota, upload zip quá cỡ.
- **Repo demo Q-03 chưa được chọn.** Engine mới chạy trên 7 repo công khai do người kiểm tự chọn. Nhóm có thể chọn repo tránh được các lỗi trên, nhưng ban giám khảo có thể dán repo khác.
- **Cổng gác:** `injection.ts` khớp từng ký tự với spec, 22 câu mẫu đều qua bước kiểm đầu vào. Vẫn lọt vài dạng spec không yêu cầu: lệnh tiếng Việt diễn đạt khác, khóa Slack, Stripe, biến `..._PASSWORD=` không có ngoặc kép, SĐT có dấu cách. Đây là góp ý, chưa tính là lỗi.
- **Mức `ĐẠT`** chưa so từng dòng với `docs/spec/`.
- **Deploy đỏ:** mới xem 30 lần chạy gần nhất, tính từ 03/11.
- **Lịch sử chấm:** bản đầu của báo cáo này quá dễ với Vai B và Vai A (từng ghi 31/52). Các lần sau đã chấm lại khi chạy thật.
- Báo cáo này do AI kiểm và chưa có người duyệt lại.
