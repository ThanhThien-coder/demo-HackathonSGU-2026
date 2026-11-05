# Lỗi cần sửa sau khi deploy

Cập nhật ngày 05/11/2026, theo `main` commit `ab6ac69` trên https://demo-hackathon-sgu-2026.vercel.app/.

Tài liệu này ghi lỗi tìm được khi chạy thử site và kiểm tra code. Mỗi vai đọc phần của mình, sửa xong thì đổi **Trạng thái**.

## Tóm tắt

| Vai | Nặng | Vừa | Nhẹ | Tổng |
| :-- | --: | --: | --: | --: |
| B — Engine | 4 | 8 | 13 | 25 |
| D — Giao diện | 2 | 6 | 6 | 14 |
| C — AI | 0 | 4 | 0 | 4 |
| A — Tích hợp, deploy | 0 | 3 | 2 | 5 |
| **Tổng** | **6** | **21** | **21** | **48** |

- **Nặng:** ban giám khảo thấy ngay, hoặc chặn thao tác chính.
- **Vừa:** khó dùng, gây hiểu sai, hoặc khó tìm lỗi.
- **Nhẹ:** chưa ảnh hưởng nhiều tới người học.

## Thứ tự nên sửa

1. **B-01, B-02, B-03, B-07, B-22:** nội dung bài, ngôn ngữ và che secret đúng trước. Sửa xong phải đổi `ENGINE_VERSION`.
2. **D-05, D-07:** cửa sổ tràn màn hình và không bấm được node.
3. **D-12, C-03, C-04:** câu hỏi đúng và không lộ đáp án.
4. **D-01, B-04, B-05:** bản đồ đọc được và học theo cây.
5. **B-14, B-17, B-18, B-20, D-09, D-11, D-14, D-15, A-01:** các lỗi Vừa còn lại.

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

### B-18 · Vừa · Chống zip bomb chưa dừng giải nén thật

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

### B-22 · Nặng · Che secret bỏ sót nhiều mẫu phổ biến

- **Hiện tượng:** chạy 15 mẫu thì 10 mẫu không được che. Lọt: `SECRET_KEY` của Django, `app.secret_key` của Flask, `JWT_SECRET_KEY`, `{"password": "..."}`, `{'apiKey': '...'}`, `DB_PASSWORD_PROD`, Stripe `sk_live_`, Slack `xoxb-`, `https://user:pass@host`, private key viết trong một chuỗi. Repo thật `gothinkster/django-realworld-example-app` giữ nguyên `SECRET_KEY` 65 ký tự trong `conduit/settings.py`.
- **Nguyên nhân:** mẫu ING-110 yêu cầu từ khóa đứng ngay trước `=` hoặc `:`, nên `SECRET_KEY` và khóa có dấu nháy không khớp. Danh sách token cũng thiếu Stripe, Slack và URL `https`. Lỗ hổng nằm ở cả spec, không riêng code.
- **Hậu quả:** phần code này được hiện trên giao diện và có thể gửi cho Gemini, nguy hiểm nhất với zip upload của repo riêng tư.
- **Cần sửa:** mở rộng ING-110 và `secrets.ts`: tên khóa có hậu tố (`SECRET_KEY`, `*_PASSWORD_*`), khóa có nháy, thêm các dạng token trên. Đổi `ENGINE_VERSION` vì code đã lưu trong cache vẫn chưa được che.
- **Cần sửa thêm:** `RESET_PASSWORD: 'resetPassword'` đang bị che dù chỉ là hằng, chuỗi hex `'0...'` bị coi là số điện thoại. "Khóa bí mật đã che" ở `CockpitHeader.tsx` đếm cả email: `miguelgrinberg/microblog` báo 9 nhưng cả 9 đều là email.
- **Kiểm tra:** thêm 15 mẫu trên vào test, repo Django trên không còn `SECRET_KEY` thật.
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
- **Trạng thái:** đã chạy thật, chưa làm. Cần kiểm thêm ảnh hưởng tới alias khi xem B05.

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
