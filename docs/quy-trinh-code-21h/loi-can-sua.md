# Lỗi cần sửa sau khi deploy

Cập nhật ngày 05/11/2026, theo `main` commit `ab6ac69` trên https://demo-hackathon-sgu-2026.vercel.app/.

Tài liệu này ghi lỗi tìm được khi chạy thử site và kiểm tra code. Mỗi vai đọc phần của mình, sửa xong thì đổi **Trạng thái**.

## Tóm tắt

| Vai | Nặng | Vừa | Nhẹ | Tổng |
| :-- | --: | --: | --: | --: |
| B — Engine | 3 | 4 | 6 | 13 |
| D — Giao diện | 2 | 4 | 6 | 12 |
| C — AI | 0 | 4 | 0 | 4 |
| A — Tích hợp, deploy | 0 | 3 | 2 | 5 |
| **Tổng** | **5** | **15** | **14** | **34** |

- **Nặng:** ban giám khảo thấy ngay, hoặc chặn thao tác chính.
- **Vừa:** khó dùng, gây hiểu sai, hoặc khó tìm lỗi.
- **Nhẹ:** chưa ảnh hưởng nhiều tới người học.

## Thứ tự nên sửa

1. **B-01, B-02, B-03, B-07:** nội dung bài và ngôn ngữ đúng trước. Sửa xong phải đổi `ENGINE_VERSION`.
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
- **Cần sửa:** trong `nodes.ts`, còn từ `DISPLAY_MIN_NODES` candidate không mang cờ test thì bỏ candidate mang cờ. Dùng lại `isTestPath` trong `selective.ts`.
- **Kiểm tra:** Capstone BrewLite là `Create Order`, không còn node từ `.spec`.
- **Trạng thái:** đã xác nhận trên site, chưa làm (TASK_20).

### B-03 · Vừa · `config.get()` thành route giả

- **Hiện tượng:** BrewLite có bài `List Jwt_expires_ins` và `Charge`.
- **Nguyên nhân:** `callgraph.ts` nhận route theo tên `get` và số đối số, không xét đối số cuối có phải handler không.
- **Cần sửa:** đối số cuối phải là hàm, lời gọi bọc, hoặc tên tham chiếu tới hàm. Chuỗi, số, boolean, object, tên hằng thì không tạo route.
- **Kiểm tra:** BrewLite không còn 2 bài trên và vẫn đủ 17 route thật.
- **Trạng thái:** đã xác nhận trên site, chưa làm (TASK_20).

### B-04 · Vừa · Quá nhiều bài mở sẵn

- **Hiện tượng:** BrewLite mở 13/20 bài, `nestjs/nest` mở 19/20 ngay từ đầu.
- **Nguyên nhân:** D-07 chỉ nối bài gọi chung hàm, nên nhiều bài không có bài cha.
- **Cần sửa:** thêm `addTreeEdges` trong `nodes.ts`, nối bài theo module thành cây, cạnh thêm là `INFERRED` và có khóa bài (đề xuất D-73).
- **Kiểm tra:** BrewLite mở lúc đầu không quá 6 bài.
- **Trạng thái:** đã xác nhận trên site, chưa làm (TASK_21). Đổi cách khóa bài nên cần thử kỹ trước khi demo.

### B-05 · Vừa · Node tách rời, bản đồ quá dài

- **Hiện tượng:** BrewLite có 9 node không nối với bài nào, hàng đầu có 13 bài.
- **Nguyên nhân:** như B-04, cộng luật D-55 đưa mọi bài không có cha lên hàng đầu.
- **Cần sửa:** làm cùng B-04, rồi đo lại. Bản đồ chỉ đọc được khi có thêm D-01.
- **Kiểm tra:** BrewLite hết node lẻ, còn khoảng 3 cây (theo mô phỏng).
- **Trạng thái:** đã xác nhận trên site, chưa làm (TASK_21).

### B-06 · Vừa · Không có luồng tới tầng dữ liệu

- **Hiện tượng:** BrewLite và `nestjs/nest` có `toi_data = 0`, dù bài có gọi Prisma.
- **Nguyên nhân:** nghi engine chưa nhận `this.prisma.x.findMany()` là thao tác dữ liệu. Chưa xác minh.
- **Cần sửa:** xác minh trước, rồi sửa nhận diện `DATA_SINK` nếu đúng.
- **Kiểm tra:** bước gọi Prisma có nhãn `DATA_ACCESS`.
- **Trạng thái:** chưa xác minh.

### B-07 · Nặng · Repo Java, Go, Dart bị báo sai hoặc phân tích sai

- **Hiện tượng:** `huynhthanhnhannnh-pixel/SGU-quan-ly-nha-hang` báo `no_code`, `spring-petclinic` báo `only_manifests`, dù đều có code Java. `gin-gonic/examples` (Go) ra 13 node với ngôn ngữ `JAVASCRIPT`, `flutter/samples` (Dart) ra 2 node với ngôn ngữ `PYTHON`.
- **Nguyên nhân:** spec 11 Mục 1 có 7 ngôn ngữ `RESOLVED` và 9 `STRUCTURAL`, nhưng `LANGUAGE_REGISTRY` chỉ có 4. `.java`, `.go`, `.dart` cũng không nằm trong `KNOWN_NO_GRAMMAR`, nên engine coi như không có code và `ERR_UNSUPPORTED_LANGUAGE` không chạy. Điểm 10 trong README Vai B ghi việc này từ trước nhưng chưa ai chốt.
- **Cần sửa:** tối thiểu, nhận các đuôi spec có nhưng chưa có grammar: repo chủ yếu ngôn ngữ đó thì trả `ERR_UNSUPPORTED_LANGUAGE`, repo trộn thì cảnh báo chỉ phân tích một phần. Muốn hỗ trợ thật thì thêm phiếu B11 cho grammar và resolver. Sửa spec cho khớp phạm vi đã chốt.
- **Kiểm tra:** 4 repo trên báo đúng ngôn ngữ, không còn `no_code`, không gọi repo Go là `JAVASCRIPT`.
- **Trạng thái:** đã chạy thật trên engine, chưa làm.

### B-08 · Nhẹ · Node 0 bước

- **Hiện tượng:** E06-11 ghi `slice-list-permissions-505d25` có 0 bước, trên commit cũ.
- **Cần sửa:** chạy lại repo demo. Có thể đã hết sau TASK_16.
- **Trạng thái:** cần chạy lại.

### B-09 · Nhẹ · Danh sách thư viện lẫn đồ dev

- **Hiện tượng:** Tổng quan có `@types/jest`, `ts-node`, lẫn thư viện frontend.
- **Cần sửa:** lọc `tech_stack`, kiểm tra ảnh hưởng tới cổng gác AI trước khi đổi.
- **Trạng thái:** đã xác nhận trên site, chưa làm.

### B-10 · Nhẹ · Cảnh báo thời gian với người học

- **Hiện tượng:** hiện "Thời gian phân tích đồ thị (3070ms) vượt mức khuyến nghị (600ms)".
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
- **Cần sửa:** bổ sung trong `src/lib/messages.ts`.
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
- **Nguyên nhân:** "Hoàn thành" chỉ đếm bài đạt. Chữ "cần ôn" sai vì D-35 đã bỏ ôn tập.
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
- **Nguyên nhân:** spec chia X-Ray và Feynman thành 2 tab, giao diện hiện tại đặt chung.
- **Cần sửa:** thu gọn hoặc ẩn phần giải thích khi đang trả lời, nộp xong mới mở lại.
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
- **Cần sửa:** sửa prompt và thêm kiểm tra quan hệ giữa các dòng được nhắc tới, ghi vào `review/loi_da_gap.md`.
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
- **Trạng thái:** đã xác nhận, chưa làm.

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

## Cần nhóm quyết

### Q-A · Luật đạt bài

Đúng 2/3 câu mà bài vẫn `Chưa đạt`, không học lại được trong phiên. Đây là luật đang có (03 Mục 6.5, D-16, D-35), bài sau vẫn mở kèm ⚠.

| Hướng | Thay đổi | Đánh đổi |
| :-- | :-- | :-- |
| Giữ luật, sửa hiển thị | Hiện "Đạt 2/3 câu" | Ít việc nhất, nên chọn cho bản thi |
| Đạt theo tỉ lệ | Đúng từ 2/3 là `Hoàn thành` | Đổi luật tính điểm |
| Cho làm lại câu sai | Trả lời lại câu chưa đạt | Đổi D-16, D-35, đụng Vai A, C, D |

## Không cần sửa

- Không có nút zoom: báo nhầm, nút đã có ở `CanvasToolbar.tsx`.
- Bài `Chưa đạt` không học lại được: đúng spec, xem Q-A.
- Nút "Bắt đầu trả lời (1 câu)": đúng, vì đã xong 1 trong 2 câu.

## Chưa kiểm được

- Biến môi trường và log của Vercel.
- `Auth Login` sau bài `Auth Me` chưa đạt có mở kèm ⚠ không.
- Nút "Báo sai kết quả chấm" có đổi màu node ngay không.
