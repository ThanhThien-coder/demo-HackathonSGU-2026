# Báo cáo tiến độ quy trình code 21 giờ

Ngày kiểm: 04/11/2026 · Mốc kiểm: commit `9a9e151` của `main` · Bộ phiếu: 52 phiếu của 5 vai

## 1. Tóm tắt

**25/52 phiếu đạt.** Test đều xanh, nhưng dự án chưa sẵn sàng để demo, vì còn 4 việc lớn:

1. **Chưa deploy được.** 30 lần chạy `deploy` gần nhất đều đỏ do repo chưa có Secrets GCP.
2. **Giao diện lệch spec ở hai phần lõi.** Code chưa dùng ReactFlow và Monaco như [`spec/30_UI.md`](../spec/30_UI.md) yêu cầu.
3. **Engine yếu trên repo thật.** Test xanh trên `shop-api`, nhưng chạy repo GitHub thật thì nhiều lát cắt dừng ở controller, xem Mục 4 phần Vai B.
4. **Chưa chạy thử đầu cuối.** E06–E10 chưa có kết quả nào được ghi lại.

| Vai | Đạt | Đạt một phần | Chưa làm | Không kiểm được | Tổng |
| :-- | :-: | :-: | :-: | :-: | :-: |
| [A — Trưởng tích hợp](vai-A/README.md) | 8 | 4 | 0 | 0 | 12 |
| [B — Engine](vai-B/README.md) | 4 | 6 | 0 | 0 | 10 |
| [C — AI + BKT](vai-C/README.md) | 8 | 2 | 0 | 0 | 10 |
| [D — Giao diện](vai-D/README.md) | 0 | 7 | 0 | 3 | 10 |
| [E — Kiểm thử, demo, slide](vai-E/README.md) | 5 | 0 | 5 | 0 | 10 |
| **Tổng** | **25** | **19** | **5** | **3** | **52** |

**Vai B được kiểm kỹ hơn các vai khác:** chỉ Vai B được chạy thật trên repo GitHub, vì engine chạy được mà không cần Gemini hay Supabase. Mức `ĐẠT` của Vai A và C mới dựa vào test, nếu chạy thật có thể lộ thêm lỗi tương tự.

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
| Gọi thử app ở máy | `/api/health` trả 200, `/api/me` không token trả 401 đúng mã, các trang chính trả 200 |

## 3. Các mốc lớn

| Mốc | Gồm | Tình trạng |
| :-- | :-- | :-- |
| Lát dọc 1 | A07, B07, C06, D06 | A07, C06 đạt theo test. B07 còn lỗi trên repo thật. D06 có code nhưng chưa ai chạy tay luồng thật |
| Lát dọc 2 | A10, C08, D08 | Backend đạt. D08 có code nhưng chưa chạy tay, và bundle offline chưa chuẩn |
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
| A05 | ĐẠT | Phiên, cache RAM, quota | Không |
| A06 | ĐẠT | Nối `/api/ingest` | Không |
| A07 | ĐẠT | Nối `/api/analyze-node` | Chạy tay luồng repo demo |
| A08 | ĐẠT | Nối `/api/enrich-node` | Không |
| A09 | ĐẠT MỘT PHẦN | Dockerfile | Chưa có bằng chứng chạy trên staging |
| A10 | ĐẠT | Nối `/api/evaluate-feynman`, `/api/reveal` | Chạy tay kịch bản A, đóng Issue #12 |
| A11 | ĐẠT | Các API còn lại | Đóng Issue #13 |
| A12 | ĐẠT MỘT PHẦN | Kiểm đủ endpoint, deploy | Đủ 14 endpoint trong code, nhưng chưa kiểm trên staging |

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
| B08 | ĐẠT MỘT PHẦN | Sửa theo repo demo, tất định | Tất định đạt trên 7 repo, nhưng ô "lát cắt đi tới DATA_ACCESS" chỉ đạt trên `shop-api`. Repo thật hợp tiêu chí Q-03 thì 0/14 luồng tới được |
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
| C10 | ĐẠT MỘT PHẦN | Duyệt tay, đóng băng bundle | Thiếu `scripts/record-bundle.ts`, chưa duyệt tay. Bundle hiện tại có dấu hiệu dựng tay, cần ghi lại từ AI thật |

### Vai D — Giao diện

Code của cả vai vào `main` qua PR #109, chưa có PR theo từng phiếu, và Issue D01–D10 còn mở.

| Phiếu | Mức | Việc | Còn lại |
| :-- | :-- | :-- | :-- |
| D01 | ĐẠT MỘT PHẦN | Khung website, bộ UI | Ghim lại 5 gói có `^` |
| D02 | ĐẠT MỘT PHẦN | Store, client API, bảng lỗi | Thiếu test `workbench`, store `workbench.ts` chưa được dùng |
| D03 | ĐẠT MỘT PHẦN | Bản đồ bài học | **Chưa dùng ReactFlow**, thiếu các file `components/canvas/` |
| D04 | ĐẠT MỘT PHẦN | Khung xem code | **Chưa dùng Monaco**, thiếu `CodePane.tsx` |
| D05 | ĐẠT MỘT PHẦN | Phân tích X-Ray, Tổng quan | Thiếu `SkillChips.tsx`, `overview-view.ts`, chưa xác nhận đủ 3 giai đoạn D-71 |
| D06 | KHÔNG KIỂM ĐƯỢC | Trang chủ, đăng nhập, nối API | Đủ file, cần chạy tay với Supabase thật |
| D07 | ĐẠT MỘT PHẦN | Trả lời Feynman | Thiếu `RunSummary.tsx`, các ca T chưa chạy tay |
| D08 | KHÔNG KIỂM ĐƯỢC | Áp response, offline | Đủ file, cần chạy tay, chờ bundle chuẩn từ C10 |
| D09 | KHÔNG KIỂM ĐƯỢC | Trang phụ, responsive | Đủ file, cần chạy tay T12, T29 |
| D10 | ĐẠT MỘT PHẦN | Kiểm agent, sửa giao diện | Đã bỏ `/dev` và dữ liệu giả, chờ D03, D04, D05, D07 |

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
| 1 | Tạo Secrets GCP và Supabase, cho `deploy` xanh tới staging, chốt dùng Supabase nào cho production | A | A03, A09, A12 |
| 2 | Sửa engine: giải `require` qua `index`, gọi hàm qua module Python, kiểm gói `expo-router`, regex `pyproject.toml`, lát cắt lẫn hàm, node 0 bước | B | B04–B08, B10 |
| 3 | Chạy tay luồng thật: đăng nhập, dán repo demo, phân tích, trả lời, chấm | E, D, A | E06, D06, A07 |
| 4 | Quyết định ReactFlow và Monaco: làm đúng spec, hay sửa spec và phiếu theo code | D, cả nhóm | D03, D04 |
| 5 | Bù phần thiếu: chip kỹ năng, `RunSummary`, 3 giai đoạn Tổng quan, dùng hoặc bỏ `workbench.ts` | D | D02, D05, D07, D10 |
| 6 | Viết `review-run.ts`, chạy kịch bản A, B và các ca trục trặc | E | E07, E08 |
| 7 | Viết `record-bundle.ts`, ghi lại bundle từ AI thật, đăng số đo Gemini | C | C01, C10, D08 |
| 8 | Chạy Definition of Done, quay video, điền số đo, làm slide | E | E09, E10 |
| 9 | Ghim 5 gói `^`, đóng Issue #12, #13, xem lại `auth/callback` theo ghi chú PR #109 | A, D | A01, D01 |

5 PR Dependabot (#77–#81) còn mở, trong đó có các bản nâng lớn. Không nên merge trước giờ thi nếu chưa thử.

## 6. Giới hạn của báo cáo

- **Chưa chạy:** Gemini thật, Supabase thật, deploy, trình duyệt. Các ô chạy tay trong phiếu vì vậy chưa được chứng minh, kể cả ở những phiếu `ĐẠT`.
- **Repo demo Q-03 chưa được chọn.** Engine mới chạy trên 7 repo công khai do người kiểm tự chọn, chưa phải repo thi. Nhóm có thể chọn repo demo tránh được các lỗi trên, nhưng ban giám khảo có thể dán repo khác.
- **Mức `ĐẠT`** dựa vào test xanh và đọc code có chọn lọc, chưa so từng dòng với `docs/spec/`.
- **Lần chấm đầu cho Vai B 10/10 là quá dễ.** Lần đó chỉ dựa vào test, mà test do chính AI viết. Bản này đã chấm lại sau khi chạy repo thật.
- **Bundle dựng tay** là suy đoán từ dấu vết: `recorded_at` là 27/10/2024, thiếu script ghi, và file vào qua commit giao diện. Cần người làm xác nhận.
- **Deploy đỏ:** mới xem 30 lần chạy gần nhất, tính từ 03/11.
- Báo cáo này do AI kiểm và chưa có người duyệt lại.
