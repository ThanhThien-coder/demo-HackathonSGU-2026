# Phân tích sửa spec, doc-de-hieu, pitch

Cập nhật ngày 05/11/2026, trên nhánh `docs/loi-ngon-ngu` đã gộp `main` commit `29270c9`.

**Trạng thái:** đã sửa spec, `doc-de-hieu`, pitch theo phân tích này, chưa commit. Áp dụng đề xuất của D-73, Q-H, Q-I, Q-J, Q-K, Q-L, Q-D.

**Chưa sửa vì chờ nhóm:** S-11 và các dòng Cloud Run (Q-C), Q-03 và tên bài trong `KICH_BAN_DEMO.md` (Q-G), hiển thị "Đạt 2/3 câu" (Q-A).

**Spec đang đi trước code:** `PREFLIGHT_TIMEOUT_MS`, `PREFLIGHT_PAGE_TIMEOUT_MS`, `UI_PANE_WIDTHS_PCT` khác `config.ts`. `ENGINE_VERSION` giữ `1.6.0`, đổi cùng PR code. `active_tab` còn trong `02` vì code vẫn dùng.

**Thay đổi so với lúc phân tích:** `S-23` thêm luật bỏ `S[-2] = auth`, nếu không `/auth/login` thành `Login Auth`. Trong `05_du_lieu_va_api.md`, dòng 134–165 nói về tab trình duyệt nên giữ nguyên.

**Phạm vi:** `docs/spec/`, `docs/doc-de-hieu/`, `docs/pitch/`, và dòng trần dung lượng trong `AGENTS.md`, `CLAUDE.md`.

**Không thuộc phạm vi:** phiếu `vai-*`, task, `loi-can-sua.md` và quy trình 21 giờ. Các phần đó chỉnh sau khi tài liệu ở trên đã xong.

## 1. Kết luận

Phân tích này **đủ để bắt đầu sửa sau khi chốt Mục 4**. S-08, S-09, S-14 đã có trong spec. S-11 chờ nhóm chốt Q-C. Các việc còn lại làm được ngay khi chốt các câu của Mục 4.

Bản phân tích trước có 5 chỗ sai hoặc thiếu, đã sửa ở bản này:

| # | Bản trước | Đã kiểm lại | Bản này |
| :-- | :-- | :-- | :-- |
| 1 | Luật cây D-73 theo TASK_21 | Trên `shop-api`, cả bản đồ chỉ còn 1 bài mở đầu là `Order Email`, `Đăng ký` bị khóa sau nó. T-ENG-38 đỏ | Thêm 2 điều kiện, xem Mục 3.2 |
| 2 | B-14: tăng trần lên 5000ms | Gọi trang repo mới mất 8–11 giây, tăng lên 5000ms vẫn hỏng | Thăm dò bằng `archive/HEAD.zip`, xem Mục 3.1 |
| 3 | S-13 chỉ sửa `00`, `11`, `50` | Còn đụng `01`, `02`, `20`, `30` và D-56 | Bổ sung ở Mục 6 |
| 4 | S-05 chuyển hẳn bảng ngôn ngữ | `07` Mục 3 đã dự trù cắt, INV-09 vẫn đúng | Chỉ thêm 1 quyết định và 1 dòng |
| 5 | Chỉ phân tích spec | Pitch và `doc-de-hieu` có câu sai với bản thi | Bổ sung Mục 7, 8 |

## 2. Rủi ro lớn nhất

| Rủi ro | Vì sao nguy hiểm | Xử lý |
| :-- | :-- | :-- |
| **Pitch nói sai sản phẩm** | `PHAN_BIEN_BGK.md` nói có màn hình Flutter, Android, iOS. Code chỉ có TS/JS và Python | Sửa theo Q-H, ưu tiên cao vì giám khảo hỏi trực tiếp |
| **Host** | Tài liệu ghi Cloud Run là host chính, site đang chạy trên Vercel, workflow Cloud Run thất bại | Chốt Q-C trước khi thuyết trình |
| **Tài liệu tả giao diện cũ** | Spec, `doc-de-hieu`, pitch còn tả buồng lái 3 cột, Tab 1, Tab 2. Site đã là giao diện mới | Viết lại theo giao diện thật, xem Mục 6.12 |
| **Hết chỗ trong spec** | `11` còn 1 byte, `04` còn 122 byte | Nâng trần trước, Q-L |
| **Đổi tên bài** | Đổi tên là đổi `node_id` | Làm trong đợt 2, kèm đổi `ENGINE_VERSION` |

## 3. Bằng chứng mới

Đo ở máy local, trên bản sao tạm. Chưa đo trên Vercel, và bản sửa thử chưa nằm trong repo.

### 3.1. Thăm dò repo (B-14)

Gọi lần đầu tới 10 repo chưa dùng, chia 2 nhóm để loại ảnh hưởng thứ tự:

| Địa chỉ | Thời gian |
| :-- | :-- |
| `HEAD github.com/{owner}/{repo}` | **8,2–11,2 giây**, có 1 lần trả 504 |
| `HEAD github.com/{owner}/{repo}/archive/HEAD.zip` | **0,42–0,50 giây**, cả 10 lần đều có kết quả |

| Ca | `archive/HEAD.zip` | Trang repo |
| :-- | :-- | :-- |
| Repo không tồn tại | 404 trong 0,38 giây | 404 trong 9,6 giây |
| Repo đổi tên (`tiangolo/fastapi`) | 301 sang `fastapi/fastapi/archive/HEAD.zip` | 301 sang `fastapi/fastapi` |

**Kết luận:** chậm là do trang repo, không phải do mạng hay server. `ING-32` đã gọi `archive/HEAD.zip`, nên có thể bỏ bước gọi trang repo khi đường này thành công. 0,5 giây vẫn vượt trần 300ms, nên trần phải tăng.

### 3.2. Cây bài học (D-73)

Bản TASK_21 cho kết quả sai trên `shop-api`:

```text
Bài mở đầu duy nhất: Order Email
Order Email > Create Register, Order Email > List Products
```

Lý do: thư mục `routes/` dùng `services/`, nên bài trong `routes/` bị xếp làm con của bài trong `services/`. Thư mục ở đây là **tầng kỹ thuật**, không phải thứ tự học.

Bản mới thêm 2 điều kiện:

1. Chỉ áp cho lát cắt, không áp cho node thuật toán. D-56 giữ nguyên.
2. Cạnh khác module chỉ thêm khi bài cha **dễ hơn** bài con theo D-07.

| Repo | Bài | Mở sẵn | Bài lẻ | Cạnh thêm | Sâu nhất | Hàng | Rộng |
| :-- | --: | :-- | :-- | --: | --: | --: | --: |
| BrewLite | 17 | 10 → 4 | 6 → 0 | 6 | 6 | 7 | 1610 |
| `shop-api` | 7 | 4 → 3 | 0 → 0 | 1 | Chưa đo | Chưa đo | Chưa đo |
| `nestjs-realworld` | 20 | 18 → 5 | 17 → 2 | 13 | 2 | 3 | 4160 |
| `node-express-realworld` | 20 | 9 → 4 | 6 → 2 | 5 | 5 | 6 | 1600 |
| `node-express-boilerplate` | 14 | 2 → 2 | 1 → 1 | 0 | 11 | 12 | 480 |
| `full-stack-fastapi-template` | 20 | 11 → 4 | 10 → 1 | 7 | 9 | 10 | 2240 |
| `microblog` | 20 | 19 → 4 | 18 → 1 | 15 | 2 | 3 | 3040 |

Số BrewLite tính sau khi đã sửa thử các lỗi đợt 1. `shop-api` còn 3 bài mở đầu: `Create Register`, `List Products`, `Order Email`, chỉ thêm 1 cạnh `List Products > Report Revenue`.

Bài mở đầu của BrewLite: `App Hello`, `Auth Me`, `Get Product`, `List Promotions`.

**Điểm bạn nên đọc tay:** thứ tự vẫn có `Auth Me` → `Auth Login` → `Auth Register`, tức học "xem tài khoản" trước "đăng nhập". Đây là hệ quả của D-07 dễ trước khó sau, và các cạnh này là `RESOLVED` có từ trước, không do cây thêm vào.

### 3.3. Test sau khi sửa thử

Chạy toàn bộ test với các bản sửa, cây mới và `ENGINE_VERSION = 1.7.0`: 3 test đỏ, còn lại xanh. Cả 3 đều có lý do:

| Test | Lý do | Xử lý |
| :-- | :-- | :-- |
| X-01 "đúng 6 cạnh" trong `repo-demo.test.ts` | Có thêm cạnh `N3 → N7`, bài bắt đầu còn N1, N3, N6 | Sửa kỳ vọng, đúng với luật mới |
| `fixtures.test.ts` | `shop-api.json` còn `1.6.0` | Đổi cùng lúc với số phiên bản |
| `ENG-60 / ENG-40` | Bản thử chặn nhầm `const h = makeHandler(cfg)` | Luật S-02 đã tính ca này |

T-ENG-28, T-ENG-37, T-ENG-38 đều xanh với luật mới.

### 3.4. Che secret (S-21)

Mẫu mới đã chạy thử: che đủ 9 ca gán, token Stripe, Slack, URL `https`, private key trong 1 dòng. Không che nhầm `'current-password' : 'new-password'`, `http://localhost:3000/path`, `https://x.com:443/a@b`.

Vẫn che nhầm một số hằng như `token_type: "bearer"`, `RESET_PASSWORD: 'resetPassword'`. Chấp nhận được, vì che thừa an toàn hơn lộ khóa, nhưng người học sẽ thấy `<REDACTED_SECRET>` ở các chỗ đó.

## 4. Cần chốt trước khi sửa

| Mã | Câu hỏi | Đề xuất | Đánh đổi | Chặn |
| :-- | :-- | :-- | :-- | :-- |
| Q-B | Duyệt lại luật cây | **Duyệt D-73 bản mới ở Mục 6.1** | Bạn đã chốt "cây", nhưng luật chi tiết vừa đổi | S-13 |
| Q-H | Phạm vi ngôn ngữ | Bản thi chỉ TS/JS, Python, repo chủ yếu ngôn ngữ khác thì báo chưa hỗ trợ | Mất lời hứa về Flutter, Android, iOS, nhưng nói đúng sự thật | S-05 |
| Q-I | Thăm dò repo | Dùng `archive/HEAD.zip`, chỉ gọi trang repo khi 404 | Sửa cả spec và code `probe.ts`, `refs.ts` | S-15 |
| Q-J | Sửa luật tên bài | Làm bản tối thiểu ở S-23 | Đổi tên kéo theo đổi id | S-23 |
| Q-K | Luật nhận router | Luật ở S-02 | Cần test, có thể sót route lạ | S-02 |
| Q-L | Trần byte | `04` ≤ 42 000, `10` ≤ 44 000, `11` ≤ 46 000 | Đổi lại D-75 vừa chốt | S-01 … S-05, S-10, S-13, S-15 … S-23, S-25, S-26 |
| Q-G | Repo demo (Q-03) | BrewLite, **nếu đúng là repo sẽ demo** | Phải viết lại kịch bản theo tên bài BrewLite và thu lại bản offline. `shop-api` vẫn giữ làm repo test | S-24, `KICH_BAN_DEMO.md` |
| Q-C | Host chính | Trưởng nhóm chốt theo thực tế deploy | Đổi sang Vercel phải sửa nhiều chỗ, xem Mục 9. Chưa đọc được `tieu_chi_cham_diem.pdf`, cần xem có tiêu chí về Google Cloud không | S-11 |
| Q-D | Spec 30 theo giao diện thật? | **Đã chốt:** theo giao diện mới, 3 cột là giao diện cũ | Minh chốt 05/11/2026. Việc lớn, làm sau cùng | S-07 |
| Q-A | Luật đạt bài | Giữ luật, hiện "Đạt 2/3 câu" | Ít việc nhất | Một phần S-06 |

## 5. Thứ tự sửa

1. Chốt Mục 4.
2. Nâng trần: `00` D-75, `AGENTS.md` luật 7, `CLAUDE.md` dòng "Spec files are normative".
3. Sửa `00`, vì quyết định phải đổi trước.
4. Sửa `01`, `02`, `10`, `11`, `12`.
5. Sửa `20`, `30`, `50`, rồi `04`.
6. Sửa `doc-de-hieu`, rồi pitch.
7. Chạy kiểm ở Mục 10.

## 6. Sửa spec

Mọi việc có ca test thì sửa cả ca test của file đó.

### 6.1. `00_QUYET_DINH.md`

Còn trống 2 347 byte, dự kiến dùng khoảng 1 800–2 300 byte kể cả D-77 ở Mục 6.12 (ước tính), nên phải viết ngắn và đo lại ngay sau khi sửa file này.

| Việc | Chỗ sửa | Sửa thành |
| :-- | :-- | :-- |
| Q-L | D-75 | Thêm `spec/04` ≤ 42 000, `spec/11` ≤ 46 000, đổi `spec/10` thành ≤ 44 000 |
| S-13 | Dòng 9, danh sách mã | Thêm `D-73`, `D-76` |
| S-13 | Thêm D-73 sau D-72 | Xem dưới |
| S-13 | D-07, cuối ô | "Lát cắt chưa có cha được nối thêm theo D-73." |
| S-13 | D-56, ý "vẫn đứng riêng" | Giữ nguyên, vì D-73 không áp cho node thuật toán |
| S-03 | D-63, câu "; vẫn chỉ trừ điểm." | "; bị bỏ khỏi node khi còn đủ candidate thật (`11` Mục 11), ngược lại chỉ trừ điểm." |
| S-05 | Thêm D-76 sau D-75 | Xem dưới |
| S-24 | Mục 3, Q-03 | Ghi repo đã chốt theo Q-G |
| S-11 | D-27, D-64 | Theo Q-C |

**D-73:**

> **D-73** | **Cây bài học** (chốt 05/11/2026): sau Display Budget, lát cắt chưa có cha được nối thêm theo module (thư mục cha của `files[0]`). Bài dễ nhất chưa có cha của module là bài đầu nhánh, bài chưa có cha còn lại là con của nó. Module dùng module khác thì nối 2 bài đầu nhánh khi bài cha dễ hơn (D-07). Không áp cho node thuật toán, node ảo. Cạnh thêm `INFERRED`, khóa bài như cạnh thường. | `02`, `11`, `30`, `50`

**D-76:**

> **D-76** | **Ngôn ngữ của bản thi** (chốt 05/11/2026): cắt theo `07` Mục 3. `LANGUAGE_REGISTRY` chỉ có TS, TSX, JS, Python. Java, Go, Dart và tầng `STRUCTURAL` là thiết kế sau thi, kể cả màn hình Flutter, Android, iOS của D-57. Đuôi các ngôn ngữ đó xếp vào `KNOWN_NO_GRAMMAR`. | `01`, `02`, `10`, `11`

### 6.2. `01_KIEN_TRUC_VA_LUONG.md`

| Việc | Chỗ sửa | Sửa thành |
| :-- | :-- | :-- |
| S-05 | INV-09, câu "Chỉ TS/JS và Python được kiểm chứng cho bản thi." | "Bản thi chỉ nạp và kiểm chứng TS/JS, Python (D-76)." |
| S-13 | Dòng 73, "cạnh giữa node (D-07)" | "cạnh giữa node (D-07, D-73)" |

Chỉ làm rõ, không phá INV-09.

### 6.3. `02_CONTRACTS.md`

Còn trống 1 615 byte.

| Việc | Chỗ sửa | Sửa thành |
| :-- | :-- | :-- |
| S-15 | Dòng 55 | `PREFLIGHT_TIMEOUT_MS: 1500,` |
| S-15 | Sau dòng 56 | `PREFLIGHT_PAGE_TIMEOUT_MS: 12000,  // Chỉ gọi trang repo khi archive/HEAD.zip trả 404` |
| S-05 | Dòng 63, chú thích | "> 50% byte code thuộc tier UNSUPPORTED ⇒ ERR_UNSUPPORTED_LANGUAGE" |
| S-13 | Dòng 314, chú thích `confidence` | Thêm "; cạnh cây D-73 luôn INFERRED" |
| S-17 | Dòng 344, chú thích `ref_label` | "Nhánh mặc định nếu biết; `null` khi GitHub chỉ trả SHA — chỉ hiển thị" |

Hai con số thời gian là đề xuất theo số đo local, cần đo lại trên Vercel.

**Không sửa ở bước này:**

- `ENGINE_VERSION`: đổi cùng PR code, nếu đổi trước thì spec lệch code.
- `PROMPT_VERSION`, `LLM_RETRY_DELAY_MAX_MS`, `HISTORY_MISSED_POINTS_MAX`, `GRADE_REFERENCED_MAX`: spec đã đúng theo D-74, code Vai C chưa làm.

### 6.4. `10_ENGINE_INGEST.md`

Dự kiến thêm khoảng 1 600–2 200 byte (ước tính), vượt trần hiện tại nên cần Q-L.

| Việc | Chỗ sửa | Sửa thành | Lỗi |
| :-- | :-- | :-- | :-- |
| S-16 | Mục 1, ý 2 **ING-11** | Thêm "scheme và host không phân biệt hoa thường; giữ nguyên owner, repo" | B-15 |
| S-15 | Mục 2, ý 1–2, sơ đồ đầu file | Xem dưới | B-14 |
| S-15 | **T-ING-07**, **T-ING-09** | Đổi theo luồng mới, thêm ca `HEAD.zip` 301 và ca 404 có trang repo 200 | B-14 |
| S-17 | Mục 3, **ING-32** | Sau `ref_label = ref` thêm "; `ref` là SHA 40 hex ⇒ `ref_label = null`" | B-16 |
| S-17 | **T-ING-08** | Thêm ca `Location` chứa SHA ⇒ `ref` giữ nguyên, `ref_label null` | B-16 |
| S-26 | Mục 4A, **ING-48** | Thêm "manifest cũng tải song song, chỉ manifest trong scope và ở gốc" | B-32 |
| S-19 | Mục 6, **ING-60** ý (3) | Thêm "bỏ `__MACOSX/` và file `._*` trước khi xét" | B-19 |
| S-19 | Mục 7, **ING-71** | Thêm `__MACOSX` vào danh sách | B-19 |
| S-20 | Mục 8 ý 1 **ING-80** | Thêm "so không phân biệt hoa thường, dùng tên thư mục thật" | B-21 |
| S-18 | Mục 8 ý 3 | Thêm "(d) Scope tự chọn không dựng được bài (`ERR_NO_ARCHITECTURAL_SLICE`) ⇒ thử ứng viên kế tiếp, kể cả client, cuối cùng `\"\"`" | B-17 |
| S-03 | Mục 8 ý 8 **ING-87** | Thêm `integration`, `sample`, `samples`, `mocks` | B-20, B-34 |
| S-21 | Mục 11 **ING-110**, **T-ING-27** | Xem dưới | B-22 |
| S-05 | Mục 13 **ING-131** | Xem dưới | B-07 |

**S-15, thay Mục 2 ý 1–2:**

> 1. `HEAD https://github.com/{owner}/{repo}/archive/HEAD.zip` (ING-20), `redirect: "manual"`, `User-Agent: SimpliFey`, timeout `CONFIG.PREFLIGHT_TIMEOUT_MS`; kết quả dùng lại cho ING-32.
> 2. 302 ⇒ `OK` (ING-21) · 301 ⇒ lấy `owner/repo` mới từ `Location`, gọi lại 1 lần · 451, 429, 403 và hết giờ như cũ.
> 3. 404 ⇒ `HEAD https://github.com/{owner}/{repo}`, timeout `CONFIG.PREFLIGHT_PAGE_TIMEOUT_MS`: 404 ⇒ `NOT_FOUND_OR_PRIVATE`; 200 ⇒ tiếp ING-32 (2); hết giờ ⇒ `TIMEOUT`.

Cách này giữ được 3 lỗi khác nhau: repo không tồn tại, repo rỗng, mạng chậm. Đường bình thường không còn gọi trang repo.

**S-21, ING-110:**

- Mẫu gán: `(?:(["'])[A-Za-z0-9_]*KEY(?:_[A-Za-z0-9]+)*\1|\b[A-Za-z0-9_]*KEY(?:_[A-Za-z0-9]+)*\b)\s*[:=]\s*(["'`])([^"'`\r\n\s]+)\2`, với `KEY` là danh sách từ khóa hiện có. Khi viết vào code phải đánh lại số nhóm.
- Thêm token: `\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b`, `\bxox[abprs]-[A-Za-z0-9-]{10,}\b`.
- Chuỗi kết nối: thêm `https?`, phần mật khẩu không chứa `/`.
- Private key trong 1 dòng: thay cả đoạn từ `-----BEGIN` tới `-----END …-----`.
- T-ING-27: thêm `SECRET_KEY = "..."`, `{"password": "..."}`, và ca không che `'current-password' : 'new-password'`.

**S-05, ING-131:** đổi thành:

> `unsupported_ratio > CONFIG.UNSUPPORTED_LANGUAGE_RATIO` ⇒ `ERR_UNSUPPORTED_LANGUAGE`, kể cả khi còn file code. `unsupported_ratio > 0` và còn file code ⇒ warning "Repo có code {ngôn ngữ} chưa hỗ trợ, chỉ phân tích phần còn lại."

Thứ tự kiểm phải đặt trước nhánh `code_file_count > 0`. Thêm ca vào T-ING-32: Go 80 KB + JS 20 KB ⇒ `ERR_UNSUPPORTED_LANGUAGE`.

### 6.5. `11_ENGINE_DO_THI.md`

Dự kiến thêm khoảng 2 500–3 000 byte (ước tính), cần Q-L.

| Việc | Chỗ sửa | Sửa thành | Lỗi |
| :-- | :-- | :-- | :-- |
| S-05 | Mục 1, sau dòng `KNOWN_NO_GRAMMAR` | "**Bản thi (D-76):** `LANGUAGE_REGISTRY` chỉ có `TYPESCRIPT`, `TSX`, `JAVASCRIPT`, `PYTHON`; đuôi còn lại ở 2 dòng trên xếp vào `KNOWN_NO_GRAMMAR`." | B-07 |
| S-01 | Mục 2 **ENG-20**, câu cuối | "`line_start` từ decorator đầu tiên của chính symbol đó; method chỉ tính decorator liền trước nó." | B-01 |
| S-25 | Mục 2 **ENG-25**, sau "thiếu ⇒ `@/`, `~/` ⇒ `src/`" | Thêm "cạnh `tsconfig`/`package.json` gần nhất" | B-26 |
| S-04 | Mục 8 ý 4, mẫu (a), "hoặc `prisma.`" | "hoặc chuỗi receiver, sau khi bỏ `this.`, có đoạn `prisma`, `tx`, `trx`" | B-06 |
| S-22 | Mục 9 **ENG-90** | Thêm "`<module>` không là ứng viên của (a), (b)." | B-27 |
| S-03 | Mục 11, trước **ENG-110** | "Còn từ `CONFIG.DISPLAY_MIN_NODES` candidate có `files[0]` không mang cờ ING-87 ⇒ bỏ candidate mang cờ, không cộng `omitted_node_count`." | B-02 |
| S-13 | Mục 11, sau ý 6, thêm **ENG-115** | Xem dưới | B-04, B-05 |
| S-23 | Mục 13 ý 2 và **T-ENG-22** | Xem dưới | B-30 |
| S-13 | Test bắt buộc | Thêm T-ENG-41 theo dưới | B-04, B-05 |

**ENG-115 Cây bài học (D-73):** chạy trên `K` sau ý 6, trước Capstone. Xét candidate `SLICE`.

1. Module = thư mục cha của `files[0]`; dưới 3 module thì module = `files[0]`.
2. Module A dùng B khi một candidate của A có file thuộc B.
3. Sắp module theo tô-pô của quan hệ dùng, module được dùng trước. Hòa hoặc gặp vòng ⇒ độ phức tạp trung bình nhỏ hơn, rồi tên tăng.
4. Bài đầu nhánh = candidate dễ nhất (D-07) chưa có cạnh vào. Candidate chưa có cạnh vào còn lại ⇒ thêm cạnh từ bài đầu nhánh.
5. Bài đầu nhánh của A còn chưa có cạnh vào, B là module A dùng đứng sau cùng, bài đầu nhánh của B dễ hơn ⇒ thêm cạnh từ B tới A.
6. `u` đến được từ `v` ⇒ bỏ cạnh `u → v`. Cạnh thêm `confidence = "INFERRED"`, sort `edges` theo `id`.

**T-ENG-41:** 3 lát cắt cùng module ⇒ bài dễ nhất là cha của 2 bài còn lại · bài đầu nhánh module được dùng khó hơn ⇒ không nối · node thuật toán không ai gọi ⇒ vẫn đứng riêng · cạnh gây vòng ⇒ bị bỏ · chạy 2 lần cùng `edges`.

**S-23 (chờ Q-J), thêm vào Bậc 1 `ROUTE`:**

> Đoạn path tách `-`, `_` thành từ. `S[-1]` ∈ `ACTION_SEGMENTS` = cancel login logout register search verify refresh reset health ⇒ tên = `S[-1]` + `Singular(S[-2])` nếu có. `DELETE` có `|S| ≥ 2` giữ động từ.

Thêm vào T-ENG-22: `POST /orders/:id/cancel` ⇒ Cancel Order · `GET /health` ⇒ Health · `DELETE /articles/:slug/comments/:id` ⇒ Delete Article Comment. Các ca cũ không đổi. Luật này **chưa chạy thử**.

### 6.6. `12_ENGINE_MAU_ENTRY.md`

**S-02 (chờ Q-K), Mục 1 dòng Express / Koa-router / Fastify, thêm:**

> Đối số cuối là hàm, lời gọi bọc, tên tham chiếu tới hàm hoặc biến gán từ lời gọi; chuỗi, số, boolean, `null`, object, mảng ⇒ không phải route. `R` hợp lệ khi được gán từ các hàm trên trong cùng file, hoặc là tham số, import nội bộ tên `app`, `router`, `server`, `fastify`, hoặc kết thúc `Router`. `R` từ gói ngoài khác ⇒ không phải route.

**Thêm T-ENT-03:** `config.get('K', '7d')` · `cache.get('k', loadFn)` · `http.get(url, fn)` import từ `msw` ⇒ không route. `const h = makeHandler(cfg); router.get('/x', h)` · `function reg(app) { app.get('/x', h) }` ⇒ có route.

Luật tên ở điều kiện thứ hai **chưa chạy thử**. Đặt ở `12` để không tốn chỗ `11`.

### 6.7. `20_AI_GOI_VA_PROMPT.md`

| Việc | Chỗ sửa | Sửa thành |
| :-- | :-- | :-- |
| S-13 | Dòng 309, việc 4 | "main_flow: 1–2 câu kể lộ trình học chính theo thứ tự "duong_chinh", không nói đây là thứ tự chạy của ứng dụng; …" |

Lý do: `mainPath` sẽ đi qua cạnh cây, AI kể thành luồng chạy thì sai. Đây là đổi prompt. Vai C chưa code `1.1.0` nên gộp vào phiên bản đó, không tăng số mới.

### 6.8. `30_UI.md`

Còn trống 3 977 byte. Mục này là các luật riêng lẻ. Khi viết lại bố cục ở Mục 6.12, đưa các luật này vào đúng phần mới.

| Việc | Chỗ sửa | Sửa thành | Lỗi |
| :-- | :-- | :-- | :-- |
| S-17 | Dòng 72 | "`repo_name · ref_label @ sha7`, `ref_label` rỗng ⇒ `repo_name · @ sha7`" | B-16 |
| S-06 | Dòng 102 | "mở ở cỡ đọc được quanh bài đang học, kéo để xem hết" thay "`fitView` khi tải" | D-01 |
| S-06 | Dòng 110 | Thêm "không hiện cảnh báo thời gian `engine_ms` cho người học" | B-10 |
| S-06 | Mục 6.2 | Thêm "Đang trả lời ⇒ thu gọn giải thích từng bước, vẫn hiện code; nộp xong mở lại." | D-12 |
| S-06 | Dòng 164, T33 | "Luồng chính" ⇒ "Lộ trình học chính" | D-03 |
| S-06 | Dòng 164 | Thêm bảng tên tầng, xem dưới | D-06 |
| S-06 | Dòng 243 | Thay `{details.hint}` bằng câu theo bảng dưới | D-04 |
| S-06 | Mục 11 | Thêm "Cửa sổ cao tối đa màn hình trừ lề, tiêu đề và nút luôn thấy, thân cuộn." | D-05 |
| S-06 | **T32** | "Ở 1366×768: mở đọc được tên bài, kéo xem đủ 20 node, không chồng nhau" | D-01 |
| S-06 | Test bắt buộc | T35: bấm node mở vào được bài, node `LOCKED` không vào được. T36: 2 cửa sổ dài ở 1366×768 thấy đủ tiêu đề và nút | D-05, D-07 |

Dòng 53 giữ nguyên, vì ví dụ `main @ 5be1c2a` vẫn đúng khi `ref_label` có tên nhánh.

**Tên tầng:** `ENTRY_POINT` Điểm vào · `MIDDLEWARE` Kiểm tra trung gian · `BUSINESS_LOGIC` Xử lý nghiệp vụ · `DATA_ACCESS` Truy cập dữ liệu.

**`details.hint`:**

| Mã | Câu hiện cho người dùng |
| :-- | :-- |
| `submodule` | Code nằm trong submodule, SimpliFey chưa tải phần này. |
| `only_unsupported` | Repo chỉ có ngôn ngữ chưa hỗ trợ. |
| `only_manifests` | Repo chỉ có file cấu hình. |
| `no_code` | Repo không có file code. |
| `empty_subdir` | Thư mục đã chọn không có code. Hãy chọn thư mục khác. |

Câu chữ do Vai D chốt lại khi làm giao diện.

### 6.9. `50_TEST_VA_FIXTURE.md`

| Việc | Chỗ sửa | Sửa thành | Lỗi |
| :-- | :-- | :-- | :-- |
| S-13 | X-07 | Thêm D-73 vào cột luật, thêm "cạnh cây không tạo chu trình" | B-04 |
| S-13 | Mục 1.1, sau danh sách hàm dùng chung | "Engine thêm cạnh N3 → N7 theo D-73, nên bản đồ engine có điểm bắt đầu N1, N3, N6." | B-04 |
| S-12 | Mục 5 DoD | Thêm: repo NestJS nghiệp vụ, đọc nội dung 3 bài, một vòng học trên site thật, thử ở 1366×768 | Lỗi lọt qua test |
| S-24 | Mục 5 DoD | Thêm "Repo demo có bài tới `DATA_ACCESS`, Capstone không từ file test, không có bài `<module>`." Viết được ngay kể cả khi chưa chốt Q-G | B-31 |

**Mâu thuẫn có sẵn, không thuộc đợt này:** sơ đồ tay ở Mục 1.1 và `shop-api.json` vẽ N5 → N6, N7, trong khi engine thật cho N6, N7 → N5 đúng theo D-07. Spec đã ghi đồ thị engine là chuẩn, nên không bắt buộc sửa.

### 6.10. `04_KIEN_TRUC_TRIEN_KHAI.md`, `05_HA_TANG_CLOUD.md`

| Việc | Chỗ sửa | Sửa thành | Chờ |
| :-- | :-- | :-- | :-- |
| S-10 | `04` Mục 9 | Trường log an toàn cho lỗi lạ, kiểm biến môi trường lúc khởi động | Q-L |
| S-11 | `04`, `05` | Đổi host, ghi `GITHUB_TOKEN`, `maxDuration` của `/api/ingest` | Q-C |
| S-07 | `04` dòng 36, 194, 464 | Theo Mục 6.12 | Q-L |

### 6.11. Việc cũ đã có trong spec

| Mã | Kết quả kiểm |
| :-- | :-- |
| S-08 | `20` dòng 59 và AI-11 đã có, không cần sửa |
| S-09 | `20` đã có luật câu hỏi suy luận, không cần sửa |
| S-14 | `00` đã có D-74, không cần sửa |

### 6.12. Viết lại theo giao diện thật (S-07)

Đối chiếu với code `src/app/`, `src/app/learn/`. Làm sau các việc khác của `30`.

| Giao diện cũ trong tài liệu | Giao diện thật |
| :-- | :-- |
| Một trang: `result = null` thì `Landing`, ngược lại `Workbench` | Nhiều trang: `/`, `/login`, `/register`, `/roadmap`, `/roadmap/[courseId]`, `/learn`, `/history`, `/report`, `/how-it-works` |
| Cột 1 Bản đồ | Ngăn kéo "Đồ thị bài học" (`LessonGraphDrawer`), mở bằng `GraphSidebarButton` |
| Cột 2 Code | Cột trái `CodeSnippetViewer`, chứa `CodePane` (Monaco) |
| Cột 3 Tab X-Ray | `XRayPanel`, nằm dưới code ở cột trái |
| Cột 3 Tab Feynman | Cột phải `FeynmanQuestionSection`, kết quả nộp ở `SubmitEvaluationDialog` |
| Cột 3 Tab Tổng quan | Cửa sổ `RepoOverviewModal`, mở từ `CockpitHeader` |
| `components/{landing,header,canvas,code,cockpit}` | `src/app/learn/components/`, `src/components/{auth,canvas,code,home,how-it-works,layout,roadmap,roadmap-detail,ui}` |

**Quy ước từ ngữ:** "Tab 1" đổi thành "phần X-Ray", "Tab 2" đổi thành "phần Feynman", "Tab Tổng quan" đổi thành "cửa sổ Tổng quan". Không đổi `Tab 1`, `Tab 2` ở `04` dòng 75 và `05` dòng 79, vì đó là tab trình duyệt khi chuyển host.

| File | Chỗ sửa | Sửa thành |
| :-- | :-- | :-- |
| `00` | Thêm D-77 sau D-76 | "**D-77** \| **Giao diện bản thi** (chốt 05/11/2026): nhiều trang; `/learn` có code và X-Ray ở cột trái, Feynman ở cột phải, đồ thị trong ngăn kéo, Tổng quan trong cửa sổ. Thay bố cục 3 cột. \| `01`, `04`, `30`" |
| `00` | Dòng 9 | Thêm `D-77` |
| `00` | D-71 | "Tab Tổng quan" ⇒ "Tổng quan" |
| `00` | D-01, D-46, D-53 | Đổi từ "Tab", "cột" nếu có nhắc, không đổi nội dung quyết định |
| `01` | INV-06 | "**Tab 1 (X-Ray)**" ⇒ "**Phần X-Ray**". Chỉ đổi tên gọi, giữ nguyên luật |
| `01` | Dòng 44 | "Giao diện học<br/>ReactFlow · Monaco · X-Ray · Feynman · Tổng quan" |
| `01` | Dòng 113, 126 | Theo quy ước từ ngữ |
| `02` | Dòng 174 | Bỏ `UI_PANE_WIDTHS_PCT`, code không dùng. Xóa ở `config.ts` trong đợt code |
| `02` | Dòng 459 | "(Tab 1)" ⇒ "(X-Ray)" |
| `04` | Dòng 36 | "Giao diện Web" |
| `04` | Dòng 194 | Theo quy ước từ ngữ |
| `04` | Dòng 464 | Cây thư mục thật ở bảng trên |
| `20` dòng 640, `21` dòng 285, 448, `50` dòng 289, 331, 371 | Tab 1, Tab 2 | Theo quy ước từ ngữ |
| `30` | Dòng 4, Mục 2 | Danh sách trang thật. Giữ luật nhập link, zip, "Tiếp tục học" |
| `30` | Mục 2.2, 2.3 | Bố cục `/learn`, `Navbar` và `CockpitHeader`. Giữ chế độ trình chiếu, code vẫn có |
| `30` | Mục 3 | Cây component thật |
| `30` | Mục 4 | Đổi tên thành "Đồ thị bài học", thêm luật D-07: chọn bài xong đóng ngăn kéo |
| `30` | Mục 5, 6 | Đổi tiêu đề theo bảng trên. Giữ luật nội dung từng phần |
| `30` | Mục 7.4, 11, Test bắt buộc | Bỏ các câu về cột và tab. Sửa các ca T nhắc "cột", "tab" |

`active_tab` vẫn có trong `src/contracts/client.ts`. Chỉ bỏ khỏi `02` khi code đã bỏ, không đoán trước.

Luật nội dung của phần X-Ray, Feynman và Tổng quan phải giữ, nhưng cần đọc đối chiếu từng luật với code khi viết, vì mình mới so cấu trúc trang và component.

## 7. Sửa `doc-de-hieu`

Tài liệu giải thích, không dùng để code, nhưng phải khớp sản phẩm.

| File | Chỗ sửa | Sửa thành | Theo |
| :-- | :-- | :-- | :-- |
| `00_toan_canh.md` | Dòng 226 | Bỏ ý "ngôn ngữ khác hỗ trợ phân tích cấu trúc cơ bản", ghi bản thi chỉ có TS/JS, Python, ngôn ngữ khác báo chưa hỗ trợ | D-76 |
| `02_engine.md` | Mục 2, dòng 84 | Giải thích thăm dò bằng `archive/HEAD.zip`, bỏ "300 mili-giây", không ghi số cứng | S-15 |
| `02_engine.md` | Dòng 226 | Bỏ `.java`, `.go`, `.cs`, `.dart`, `.rs`, `.php`, `.cpp` khỏi danh sách hỗ trợ | D-76 |
| `02_engine.md` | Dòng 231 | Thêm: file test được giữ khi đọc, nhưng bị bỏ khỏi bài học khi còn đủ bài thật | S-03 |
| `02_engine.md` | Dòng 249 | Thêm đường lùi khi thư mục tự chọn không dựng được bài | S-18 |
| `02_engine.md` | Dòng 408 | Thêm ví dụ `SECRET_KEY`, khóa trong nháy, token Stripe, Slack | S-21 |
| `02_engine.md` | Dòng 468, 596–597, 630 | Ghi Java, Go, Dart và tầng `STRUCTURAL` là thiết kế sau thi | D-76 |
| `02_engine.md` | Dòng 699–708 | Đổi tiêu đề thành React Native, Expo cho bản thi; Flutter, Android, iOS là thiết kế sau thi | D-76 |
| `02_engine.md` | Sau dòng 1007 | Thêm mục ngắn "Cây bài học (D-73)": luật, ví dụ `N3 → N7`, cạnh nét đứt | S-13 |
| `02_engine.md` | Dòng 1118–1125 | Thêm ví dụ `Cancel Order`, `Delete Article Comment` | S-23 |
| `03_ai_va_cong_gac.md` | Dòng 226 | "Luồng chính:" ⇒ "Lộ trình học chính:" | S-13 |
| `06_giao_dien.md` | Dòng 124 | Thêm: có thể không có tên nhánh, khi đó chỉ hiện mã commit | S-17 |
| `06_giao_dien.md` | Dòng 212 | Bản đồ mở ở cỡ đọc được, kéo để xem hết | S-06 |
| `06_giao_dien.md` | Dòng 243 | Thêm: cạnh nét đứt cũng là thứ tự học do engine nối theo D-73 | S-13 |
| `06_giao_dien.md` | Dòng 496 | "Luồng chính" ⇒ "Lộ trình học chính" | S-06 |
| `07_ke_hoach_21h.md` | Dòng 75 | Thêm "đã cắt, xem D-76" | D-76 |
| `01_deploy.md` | Toàn file | Chỉ sửa khi Q-C đổi host | Q-C |
| `00_toan_canh.md` | Dòng 45, 60, 265 | "buồng lái 3 cột" ⇒ "giao diện học" | S-07 |
| `06_giao_dien.md` | Mục 2.2, 3, 4, 5, 6 | Viết lại theo Mục 6.12, giữ phần giải thích luật. Đây là việc lớn nhất của nhóm này, 75 dòng nhắc giao diện cũ | S-07 |
| `05_du_lieu_va_api.md` | Các dòng nhắc Tab 1, Tab 2, trừ dòng 134–165 là tab trình duyệt | Theo quy ước từ ngữ | S-07 |
| `04_bkt_va_cau_hoi.md` | 2 dòng nhắc Tab 1, Tab 2 | Theo quy ước từ ngữ | S-07 |
| `03_ai_va_cong_gac.md` | 3 dòng nhắc giao diện cũ | Theo quy ước từ ngữ | S-07 |

**Không cần sửa:** `00_toan_canh.md` dòng 103, `05_du_lieu_va_api.md` dòng 282, vì hai chỗ này tả bản vẽ tay của `shop-api`. `07_ke_hoach_21h.md` dòng 30 là mô tả công việc Vai D lúc lập kế hoạch, giữ nguyên.

## 8. Sửa pitch

| File | Chỗ sửa | Sửa thành | Theo |
| :-- | :-- | :-- | :-- |
| `PHAN_BIEN_BGK.md` | Dòng 58 | "Bản thi chỉ có TS/JS và Python. Java, Go, Dart và các ngôn ngữ khác là lộ trình sau thi; repo chủ yếu ngôn ngữ đó sẽ báo chưa hỗ trợ." | D-76 |
| `PHAN_BIEN_BGK.md` | Dòng 114 | Bỏ "ngôn ngữ khác có grammar thì cạnh là suy luận" | D-76 |
| `PHAN_BIEN_BGK.md` | Dòng 117 | Bỏ ý nối bằng luật chung cho ngôn ngữ khác, giữ phần giới hạn | D-76 |
| `PHAN_BIEN_BGK.md` | Dòng 138 | Chỉ nêu React Native, Expo. Thêm: thư mục tự chọn không ra bài thì thử thư mục khác | D-76, S-18 |
| `PHAN_BIEN_BGK.md` | Dòng 141 | Giới hạn `main` trong TS/JS, Python. Thêm: bài chưa có cha được nối theo thư mục thành cây, cạnh nét đứt là thứ tự học đề xuất | D-76, S-13 |
| `PHAN_BIEN_BGK.md` | Dòng 337 | Câu đúng đổi thành "Đã kiểm chứng TS/JS và Python; ngôn ngữ khác chưa hỗ trợ" | D-76 |
| `KICH_BAN_DEMO.md` | Dòng 197 | "Bản thi hỗ trợ TS/JS và Python. Ngôn ngữ khác sẽ báo chưa hỗ trợ." | D-76 |
| `KICH_BAN_DEMO.md` | Dòng 312 | Cập nhật danh sách token theo S-21, không nói "mọi secret" | S-21 |
| `KICH_BAN_DEMO.md` | Dòng 13–14 và các câu theo N1 … N7 | Chỉ sửa khi Q-G chọn BrewLite | Q-G |
| `ROADMAP.md` | Dòng 27 | Tách Java/Go/Dart và `STRUCTURAL` thành "Đã cắt khỏi bản thi" | D-76 |
| `KICH_BAN_DEMO.md` | Dòng 23, 67, 77, 79, 81, 85, 157, 241 | Đổi Tab 1, Tab 2 và "khung giữa" theo Mục 6.12. Thao tác demo phải diễn tập lại trên giao diện thật: bản đồ nằm trong ngăn kéo | S-07 |
| `PHAN_BIEN_BGK.md` | Dòng 135, 160, 162, 163, 166, 342 | Theo quy ước từ ngữ | S-07 |

**Không cần sửa:** `ROADMAP.md` dòng 63, 122, 137, 156 nói về lộ trình sau thi, vẫn đúng.

## 9. Việc chưa nên làm

| Việc | Lý do |
| :-- | :-- |
| Đổi host trong tài liệu | Chờ Q-C. Từ "Cloud Run" xuất hiện ở `PHAN_BIEN_BGK` 17 dòng, `01_deploy` 20, `05_du_lieu_va_api` 13, `04` 22, `05` 14, `03` 10, `00` 6, `ROADMAP` 6, `00_toan_canh` 5, `KICH_BAN` 1, `01` 1. Phần F của `PHAN_BIEN_BGK` viết riêng về Cloud Run |
| Sửa `docs/archive/` | Luật repo cấm coi là chuẩn |
| Sửa `TONG_QUAN_GUI_ANH_CANH.md`, `CAU_HOI_*.md` | Tài liệu đã gửi, không phải nguồn chuẩn. Dòng 93 của `TONG_QUAN` chỉ còn tả cạnh chung hàm, sửa nếu gửi lại |
| Sửa sơ đồ N5 → N6, N7 | Mâu thuẫn có sẵn, đã nêu ở Mục 6.9 |

## 10. Kiểm sau khi sửa

- `wc -c docs/spec/*.md` không vượt trần ở `00` D-75.
- `PREFLIGHT_TIMEOUT_MS`, `PREFLIGHT_PAGE_TIMEOUT_MS` trong `02` được nhắc đúng tên ở `10`, không ghi số ở file khác.
- `D-73`, `D-76`, `D-77`, `ENG-115`, `T-ENG-41`, `T-ENT-03`, T35, T36 đều có nơi định nghĩa. Trước khi sửa, các mã này chưa có trong spec.
- `grep -n "Java\|Dart\|Flutter" docs/pitch docs/doc-de-hieu`: mọi kết quả phải ghi rõ là sau thi.
- `grep -n "fitView" docs`: chỉ còn trong `archive`.
- `grep -n "3 cột\|Cột [123]\|cockpit/\|Tab 1\|Tab 2" docs/spec docs/doc-de-hieu docs/pitch`: chỉ còn `04` dòng 75, `05` dòng 79, `07_ke_hoach_21h.md`.
- Không có từ "chặn 100%", "mọi secret".
- `src/contracts/config.ts` chưa đổi, nên spec đi trước code cho tới khi làm đợt code. Ghi rõ điều này khi bàn giao.

## 11. Tự đánh giá

| Tiêu chí | Kết quả | Ghi chú |
| :-- | :-- | :-- |
| Đúng luật viết spec | Đạt | Đổi quyết định ở `00` trước, số chỉ ở `CONFIG`, không giải thích dài trong spec |
| Không phá INV | Đạt | INV-01, INV-09, INV-10, INV-11 đã đối chiếu. Cây vẫn tất định |
| Luật cây đã thử | Đạt một phần | Đã chạy test và 7 repo trên bản sao, chưa thử khóa bài trên giao diện thật |
| Thăm dò đã thử | Đạt một phần | Đã đo 12 repo bằng `curl`, chưa viết thành code, chưa đo trên Vercel |
| Vị trí sửa | Đạt | Đã đối chiếu tự động 43 chỗ trích dòng với file thật, không có chỗ sai. Mã mới không trùng mã đang có |
| Mẫu secret đã thử | Đạt | Đã chạy các ca trong Mục 3.4 |
| Luật router đã thử | **Chưa** | Mới có luật viết, cần test ở T-ENT-03 |
| Luật tên đã thử | **Chưa** | Mới có luật viết |
| Dung lượng spec | Ước tính | Số byte dự kiến chưa đo, kiểm lại sau khi sửa |
| Rà pitch, `doc-de-hieu` | Đạt một phần | Rà bằng từ khóa, chưa đọc hết từng dòng 700 KB tài liệu |
| Giao diện thật | Đạt một phần | Đã so trang và component, chưa so từng luật nội dung của X-Ray, Feynman, Tổng quan |
| Tiêu chí chấm | **Chưa** | Không đọc được `tieu_chi_cham_diem.pdf`, `thele.md` không nhắc yêu cầu về host |

**Kết luận tự đánh giá:** các phần sửa được ngay đã có bằng chứng hoặc đã đối chiếu spec. Hai luật chưa chạy thử là S-02 và S-23, nên đọc kỹ trước khi duyệt, và phải test ngay khi vào đợt code.
