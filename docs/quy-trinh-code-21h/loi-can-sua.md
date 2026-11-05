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

Mã mới lấy số kế tiếp của vai, không dùng lại mã đã bỏ (`D-02`, `A-06`). Hiện kế tiếp là `B-12`, `D-14`, `C-05`, `A-07`.

```markdown
### B-12 · Nặng | Vừa | Nhẹ · Tên ngắn

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
| B — Engine | 2 | 5 | 4 | 11 |
| D — Giao diện | 2 | 4 | 6 | 12 |
| C — AI | 0 | 4 | 0 | 4 |
| A — Tích hợp, deploy | 0 | 3 | 2 | 5 |
| **Tổng** | **4** | **16** | **12** | **32** |

- **Nặng:** ban giám khảo thấy ngay, hoặc chặn thao tác chính.
- **Vừa:** khó dùng, gây hiểu sai, hoặc khó tìm lỗi.
- **Nhẹ:** chưa ảnh hưởng nhiều tới người học.

## Thứ tự nên sửa

1. **B-01, B-02, B-03:** nội dung bài đúng trước. Sửa xong phải đổi `ENGINE_VERSION`.
2. **D-05, D-07:** cửa sổ tràn màn hình và không bấm được node.
3. **D-12, C-03, C-04:** câu hỏi đúng và không lộ đáp án.
4. **D-01, B-04, B-05:** bản đồ đọc được và học theo cây.
5. **D-09, D-11, A-01:** các lỗi Vừa còn lại.

AI đã chạy. Lỗi cũ là app gửi `thinkingBudget: 0` nên Google trả 400, Phat107 đã sửa ở commit `e94055b`.

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

- **Hiện tượng:** BrewLite và `nestjs/nest` có `toi_data = 0`, dù bài có gọi Prisma.
- **Nguyên nhân:** đọc code thấy đúng như nghi ngờ, chưa chạy thử. Với `this.prisma.user.findMany()`, `isDataSinkCall` trong `slicing.ts` so phần cuối là `user` và chuỗi đầy đủ bắt đầu bằng `this.`, nên không khớp. ENG-82 trong spec 11 viết mẫu `prisma.` nên spec cũng thiếu.
- **Cần sửa:** coi là `DATA_SINK` khi chuỗi receiver có đoạn `prisma`, kể cả `this.prisma.x`. Không nới regex receiver chung, vì `client` đã khớp cả `httpClient.get`.
- **Kiểm tra:** bước gọi Prisma có nhãn `DATA_ACCESS`, `toi_data` của BrewLite lớn hơn 0.
- **Trạng thái:** chưa làm.

### B-07 · Vừa · Repo Java báo không có code

- **Hiện tượng:** `huynhthanhnhannnh-pixel/SGU-quan-ly-nha-hang` báo `ERR_NO_SOURCE_FILES_FOUND` (E06-10).
- **Nguyên nhân:** `.java` không có trong `LANGUAGE_REGISTRY` lẫn `KNOWN_NO_GRAMMAR` của `registry.ts`. Code chỉ có TS, TSX, JS, Python, còn spec 11 Mục 1 liệt kê thêm Java, Go, Dart và 9 ngôn ngữ khác.
- **Cần sửa:** thêm các đuôi chưa hỗ trợ vào `KNOWN_NO_GRAMMAR` để trả `ERR_UNSUPPORTED_LANGUAGE`, rồi sửa spec theo việc S-05.
- **Kiểm tra:** repo trên báo đúng ngôn ngữ chưa hỗ trợ, không báo "không có code".
- **Trạng thái:** chưa làm.

### B-08 · Nhẹ · Node 0 bước

- **Hiện tượng:** E06-11 ghi `slice-list-permissions-505d25` có 0 bước, trên commit cũ.
- **Cần sửa:** chạy lại repo demo. Có thể đã hết sau TASK_16.
- **Trạng thái:** cần chạy lại.

### B-09 · Nhẹ · Danh sách thư viện lẫn đồ dev

- **Hiện tượng:** Tổng quan có `@types/jest`, `ts-node`, lẫn thư viện frontend.
- **Cần sửa:** chỉ lọc lúc hiển thị ở Tổng quan. Không đổi `fingerprint.tech_stack`, vì `21` Mục từ cấm dùng nó để biết công nghệ nào được nhắc tới.
- **Trạng thái:** đã xác nhận trên site, chưa làm.

### B-10 · Nhẹ · Cảnh báo thời gian với người học

- **Hiện tượng:** hiện "Thời gian phân tích đồ thị (3070ms) vượt mức khuyến nghị (600ms)".
- **Cần sửa:** xem lại `ENGINE_BUDGET_MS` trên Vercel, hoặc Vai D không hiện cảnh báo này cho người học.
- **Trạng thái:** đã xác nhận trên site, chưa làm.

### B-11 · Nhẹ · Bước trỏ vào dòng rỗng

- **Hiện tượng:** bài `Order` có Bước 3 ở dòng 65, file chỉ có 64 dòng code. AI vẫn viết mô tả cho bước rỗng.
- **Cần sửa:** áp đúng luật "Bỏ bước rỗng" của ENG-91 trong `nodes.ts`.
- **Trạng thái:** đã xác nhận trên site, chưa làm.

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

---

## Vai C — AI

### C-01 · Vừa · Gemini lỗi không để lại log

- **Hiện tượng:** mọi loại lỗi Gemini đều hiện "Chưa phân tích được", nên lỗi `thinkingBudget` rất khó tìm.
- **Cần sửa:** ghi mã lỗi trong `catch` của `callLLMOnce` ở `gemini.ts`, không ghi khóa hay nội dung nhạy cảm.
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
| S-08 | `20`, `02` | Ghi rõ `LLM_THINKING_BUDGET = 0` thì không gửi `thinkingConfig`, để không lặp lỗi 400 | Lỗi `thinkingBudget` đã sửa | Q-E |
| S-09 | `20` | Thêm luật câu hỏi: dòng nhắc tới phải đúng quan hệ trong code, không trả lời được bằng cách chép Tab 1. Thêm luật log lỗi Gemini | C-01, C-03, C-04 | Q-E |
| S-10 | `04` Mục 9 | Thêm trường log an toàn cho lỗi lạ, kiểm biến môi trường lúc khởi động | A-02, A-04 | không |
| S-11 | `00`, `04`, `05` | Đổi host chính theo quyết định của nhóm | A-01 | Q-C |
| S-12 | `50` Mục 5 | Thêm vào DoD: repo NestJS nghiệp vụ, đọc nội dung bài, một vòng học trên site thật, thử ở 1366×768 | Mọi lỗi lọt qua test | không |
| S-13 | `00`, `11`, `50` | Thêm quyết định D-73 và ca test cây bài học | B-04, B-05 | Q-B |

Không cần sửa spec, chỉ sửa code và phiếu: B-11, D-08, D-11, A-05. Các lỗi còn lại chưa rõ thì xác minh trước.

## Việc sửa phiếu

Các file ở `docs/quy-trinh-code-21h/`. Trạng thái chung: chưa làm. Trước khi thêm ô, xem phiếu đã có ý đó chưa. Không tự sửa `phieu-can-co.md`, vì file này do công cụ sinh ra.

| Phiếu | Thêm hoặc sửa | Lỗi |
| :-- | :-- | :-- |
| `vai-B/README.md` | Đổi các dòng "đã chốt" thành trỏ tới quyết định trong spec, sau khi xong S-01 … S-05, S-13 | B-01 … B-05 |
| B05 | Ô kiểm receiver của route, có ca `cache.get('k', loadFn)` | B-03 |
| B06 | Ô kiểm bước gọi `this.prisma.x` có nhãn `DATA_ACCESS` | B-06 |
| B07 | Ô kiểm không có bước rỗng | B-08, B-11 |
| B08 | Viết `engine-that.mjs` hoặc bỏ yêu cầu dùng công cụ này, vì repo chưa có | Công cụ thiếu |
| D03 | Bỏ ô `fitView`. Thêm ô bấm được node sẵn sàng, node khóa không vào được, nút "Thử lại" chạy | D-01, D-07 |
| D05 | Ô thử cửa sổ Tổng quan ở 1366×768, hiện tên tầng tiếng Việt | D-05, D-06 |
| D06 | Ô đổi phiên không còn thấy bài cũ, số liệu Lộ trình đúng | D-09, D-10, D-11 |
| D07 | Ô thử cửa sổ kết quả ở 1366×768, ẩn giải thích khi trả lời, backtick hiện dạng code | D-05, D-08, D-12 |
| C01 | Ô lỗi Gemini có log mã lỗi | C-01 |
| C06, C07, C08 | Ô chạy AI thật, đọc nội dung câu hỏi và đáp án, không chỉ xem test xanh | C-02, C-03, C-04 |
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
| Q-E | 6 file spec đã vượt trần byte: nâng trần hay cắt bớt? | Nâng trần cho `02`, `10`, `20`, `21`, `30`, ghi một quyết định, cắt `00` | Việc spec có cột Chờ là Q-E | chờ quyết |
| Q-F | Có nâng `ENGINE_VERSION` lên `1.7.0` và gom các đổi engine vào một lần không? | Có | Bước đổi phiên bản của B-01 … B-07 | chờ quyết |

### Q-A · Luật đạt bài

Đúng 2/3 câu mà bài vẫn `Chưa đạt`, không học lại được trong phiên. Đây là luật đang có (03 Mục 6.5, quyết định D-16, D-35), bài sau vẫn mở kèm ⚠.

| Hướng | Thay đổi | Đánh đổi |
| :-- | :-- | :-- |
| Giữ luật, sửa hiển thị | Hiện "Đạt 2/3 câu" | Ít việc nhất, nên chọn cho bản thi |
| Đạt theo tỉ lệ | Đúng từ 2/3 là `Hoàn thành` | Đổi luật tính điểm |
| Cho làm lại câu sai | Trả lời lại câu chưa đạt | Đổi quyết định D-16, D-35, đụng Vai A, C, D |

## Không cần sửa

- Không có nút zoom: báo nhầm, nút đã có ở `CanvasToolbar.tsx`.
- Bài `Chưa đạt` không học lại được: đúng spec, xem Q-A.
- Nút "Bắt đầu trả lời (1 câu)": đúng, vì đã xong 1 trong 2 câu.

## Chưa kiểm được

- Biến môi trường và log của Vercel.
- `Auth Login` sau bài `Auth Me` chưa đạt có mở kèm ⚠ không.
- Nút "Báo sai kết quả chấm" có đổi màu node ngay không.
