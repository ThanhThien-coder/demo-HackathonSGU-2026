# YÊU CẦU FRONTEND SIMPLIFEY

> Bản triển khai từ spec, không tạo nguồn quy chuẩn thứ hai. Kiểu và CONFIG chỉ định nghĩa tại [spec/02](../../../docs/spec/02_CONTRACTS.md); [contracts](../../contracts/index.ts) là bản hiện thực. Quyết định: [spec/00](../../../docs/spec/00_QUYET_DINH.md). Bất biến: [spec/01](../../../docs/spec/01_KIEN_TRUC_VA_LUONG.md). API: [spec/03](../../../docs/spec/03_API_VA_LUU_TRU.md). UI: [spec/30](../../../docs/spec/30_UI.md). Test: [spec/50](../../../docs/spec/50_TEST_VA_FIXTURE.md).
> Cách thực hiện và ma trận kiểm thử: [PLAN.md](./PLAN.md). Theo dõi bằng chứng: [TIEN_DO.md](./TIEN_DO.md). Mã YC bên dưới chỉ để truy vết yêu cầu, không thay mã UI/T của spec.

## 1. Nguồn dữ liệu và ranh giới

### YC-01 — Bất biến, contract và nhãn nguồn

Nguồn: spec/01 Mục 2; spec/02 Mục 2–10; spec/30 Mục 1.

- DAG là bản đồ bài học; BKT là mô hình năng lực kỹ năng của người học. Mỗi node là lát cắt xuyên file, không phải một file. Không tuyên bố tự phát minh các thuật toán nền.
- Online: server quyết định BKT, lượt, trạng thái node, mở khóa và đáp án. Client áp response, không cập nhật lạc quan các dữ liệu này. `attempts_used + 1` chỉ dùng tạo request, không tự tăng lượt trong store.
- Hàm BKT/plan/derive dùng chung client/server: client chỉ dùng cho hiển thị decay và offline. Similarity được dùng để kiểm đầu vào cả online. Không gọi các module này là thư viện chỉ dành cho client.
- Dùng `PERSONAS`: `NEWBIE`, `MID_LEVEL`, `SENIOR_RUSTY`; nhãn lấy từ `PERSONAS[mode].label`. Tier dùng `LearnerTier`: `NOVICE`, `PRACTITIONER`, `ARCHITECT`. Focus dùng `QuestionFocus`: `FLOW`, `ARCHITECTURE`, `WEAKNESS`, `CHANGE`. Đây là tham chiếu giá trị hiện hành, không định nghĩa type mới.
- `simplicity` là số theo contract; hiển thị “Đơn giản: {simplicity} (không ảnh hưởng Đạt)”. Kết quả đạt lấy từ server, không suy ra chỉ bằng thanh điểm.
- Online: chưa kết thúc câu thì client không giữ `reference_answer`, `must_have_points`, `fix`. Chỉ render `question.reveal` khi có và câu đã kết thúc. Offline dùng bundle ghi lại theo spec/30 Mục 8, không coi bundle công khai là cơ chế bảo mật đáp án online.
- Mọi chữ AI hiển thị plain text; chỉ cho mã nội dòng giữa backtick bằng text node, không HTML/Markdown tùy ý. X-Ray không lộ cách sửa, con số tình huống hoặc tình huống biên; không ghép đáp án từ nơi khác vào X-Ray.
- Nhãn bắt buộc: “Điểm dở — Nhận định của AI”, “Nhận định của AI — có thể chưa chính xác”, “Đáp án tham khảo do AI viết”. Không hứa chặn mọi ảo giác.
- `localStorage` chỉ lưu `sf.last_session`, `sf.prefs`; không lưu hồ sơ, nháp học, tiến độ hay biên nhận. Đọc/ghi có `try/catch`; dữ liệu hỏng dùng mặc định. Theme/layout cập nhật từng trường để không ghi đè nhau. Offline không ghi session demo vào `sf.last_session`.
- Không thêm endpoint, type API/DB hay quyết định sản phẩm. Thiếu contract thật sự phải ghi vấn đề cho vai A theo quy trình spec, không dựng mock ngầm.

### YC-02 — CONFIG và số liệu

Nguồn: spec/02 Mục 1; spec/30 Mục 1, 2.3, 11. Import CONFIG từ bản hiện thực; không gán lại hoặc chép giá trị vận hành vào tài liệu/UI.

| Tham chiếu | Mục đích |
| :-- | :-- |
| `CONFIG.SESSION_TOKEN_QUOTA` | Hạn mức hiển thị và khóa thao tác AI |
| `CONFIG.MAX_ATTEMPTS_PER_QUESTION` | Hiển thị số lượt từ state |
| `CONFIG.ANSWER_MIN_CHARS`, `CONFIG.ANSWER_MAX_CHARS` | Kiểm độ dài câu trả lời |
| `CONFIG.ANSWER_DUPLICATE_SIMILARITY` | Kiểm trùng và khớp kịch bản offline |
| `CONFIG.SUBMIT_DEBOUNCE_MS` | Thời gian tối thiểu khóa Nộp tính từ lúc gửi |
| `CONFIG.REPORT_NOTE_MAX_CHARS` | Giới hạn ghi chú báo sai |
| `CONFIG.TITLE_MAX_CHARS` | Cắt tên node khi hiển thị |
| `CONFIG.ANALYZE_CONCURRENCY` | Giới hạn request phân tích đang chạy |
| `CONFIG.MAX_UPLOAD_BYTES`, `CONFIG.MAX_STREAM_BYTES` | Giới hạn upload và tải repo, thông điệp riêng |
| `CONFIG.PASS_CORE_ACCURACY` | Vạch tham chiếu trên thanh điểm |
| `CONFIG.UI_PRESENTATION_FOCUS_PCT`, `CONFIG.UI_PRESENTATION_FONT_SCALE` | Bố cục trình chiếu |
| `CONFIG.LLM_PRICE_INPUT_USD_PER_M`, `CONFIG.LLM_PRICE_OUTPUT_USD_PER_M` | Ước tính chi phí với giả định được công bố |

Số liệu đo lấy từ response. `from_cache=true` gắn “kết quả đã lưu”: thời gian trong response là lần dựng gốc, không phải lần vừa mở. Không dùng mục tiêu hiệu năng làm số đo thực tế.

## 2. Khởi động, tài khoản và các trang

### YC-03 — Boot và khôi phục phiên

Nguồn: spec/30 Mục 7.1–7.2; [phiếu D06](../../../docs/quy-trinh-code-21h/vai-D/D06-noi-api.md).

1. Theme script chạy trước khi vẽ; Boot đăng ký phím tắt có cleanup, không khởi động trùng request khi remount.
2. Kiểm `?offline=1` trước khi tạo/gọi Supabase; vào luồng YC-14 và dừng Boot online.
3. Online: `getSession()`; chưa có session thì màn đăng nhập. Có session: `GET /api/me` cập nhật profile và `server_clock_offset_ms = server_now - Date.now()`, rồi `GET /api/sessions`.
4. Đích phiên trong URL được ưu tiên hơn `sf.last_session`. `/learn?session={id}` tải đúng id bằng ingest resume, không để phản hồi khôi phục nền đè lên URL. Mỗi id tự thử một lần; lỗi có thao tác thử lại rõ ràng.
5. Không có đích phiên trong URL thì chỉ tự khôi phục `sf.last_session` nếu phiên còn `can_resume`. `/learn` thiếu session chuyển `/roadmap`, trừ offline. Đổi phiên reset dữ liệu phiên trước và hiện loading, không chớp bài cũ.
6. Lỗi lấy hồ sơ: thông điệp + “Thử lại” + “Mở bản demo Offline”. Session không tồn tại: xóa khóa phiên lưu, báo lỗi + “Về trang chủ”. Không lặp tự động khi lỗi.

### YC-04 — Trang, điều hướng và xác thực

Nguồn: spec/30 Mục 2, 7.2; spec/03 Mục 2; phiếu D06.

| Route | Hành vi |
| :-- | :-- |
| `/` | Chưa đăng nhập: LoginScreen; đã đăng nhập: nhập repo, upload, SessionList. Thẻ demo Offline luôn có; có phiên hiện thẻ vào trang học |
| `/login`, `/register` | GitHub OAuth; đã đăng nhập về `/`; register chuyển login, không có đăng ký mật khẩu riêng |
| `/roadmap` | Danh sách phiên, không tạo mô hình khóa học mới |
| `/roadmap/[courseId]` | `courseId` chính là session id; bài theo tô-pô, trạng thái và mở bài bằng cùng luồng YC-11 |
| `/learn?session={id}` | Cockpit theo YC-07–YC-13; resume theo YC-03 |
| `/history?session={id}` | Lịch sử các lần nộp mới nhất trước, theo `HistoryResponse.items` |
| `/report?session={id}` | Báo cáo phiên và năng lực cá nhân tách biệt, YC-15 |
| `/how-it-works` | Giới thiệu Quét repo → Đọc lát cắt → Phản biện Feynman → Theo dõi năng lực |
| `/auth/callback` | Route Handler server đã có: PKCE code exchange, cookie, `next` nội bộ an toàn; tái sử dụng, không viết lại |

- Đăng nhập dùng helper Supabase hiện có, truyền `next` cho callback; không token giả, không bypass auth. Chưa xác thực không khởi chạy API học tập.
- Navbar: Trang chủ, Trang học khi có phiên, Lộ trình, Lịch sử khi có phiên online, Cách học; theme ở mọi trang. Header cockpit có Lịch sử/Báo cáo, ẩn cả hai trong offline.
- Trang phụ có loading/error/retry/empty; chưa đăng nhập hoặc thiếu session hiện EmptyState phù hợp. Không hiển thị dữ liệu phiên trước hoặc gọi API với id rỗng.
- Trang lịch sử chỉ hiển thị các trường có trong `AttemptHistoryItem`: bài, số câu/lượt, skill, câu trả lời, điểm, intent, kết quả và thời gian. Contract không trả văn bản câu hỏi, feedback hay jargon; không đọc trực tiếp DB hoặc bịa các trường này.

### YC-05 — Persona và tài khoản

Nguồn: spec/30 Mục 2.3, 9; spec/03 Mục 5.4, 6.7.

- Hiện chọn persona khi `(NEXT_PUBLIC_DEMO_MODE === 'true' hoặc offline)` và `(đã đăng nhập hoặc offline)`. Server vẫn quyết định quyền đổi persona.
- Online gửi `POST /api/demo/persona` với `mode`; thay profile/clock offset từ response, vẽ lại decay. Không ingest lại, không đổi tiến độ node. Không suy ra persona hiện tại từ điểm: chỉ nhớ lựa chọn vừa bấm, vì server không trả mode.
- Offline đổi persona: dựng lại profile/progress, xóa runs, nháp/kết quả/gợi ý gắn run cũ và bỏ node đang mở; không gọi persona API.
- Đăng xuất thành công: dọn state người dùng/phiên, vô hiệu hóa response cũ, về màn đăng nhập. Lỗi đăng xuất phải thông báo, không báo thành công giả.
- Xóa tài khoản có xác nhận “Xóa toàn bộ điểm kỹ năng, phiên học, câu trả lời. Không hoàn tác.” Chờ `DELETE /api/me` thành công mới xóa `sf.*`, signOut và tải lại. DELETE lỗi: giữ state, báo lỗi, cho thử lại. Không thực hiện xóa tài khoản trong offline.

## 3. Ingest và cockpit

### YC-06 — Nhập repo, upload, tiếp tục học

Nguồn: spec/30 Mục 2.1–2.3; D-27, D-38, D-42, D-59.

- Ô URL rỗng: tắt Quét repo. URL sai: `ERR_INVALID_GITHUB_URL`. Luôn ghi “Chỉ hỗ trợ nhánh mặc định.” Link `/tree/…`, `/blob/…`: ghi chú amber về cắt về gốc, vẫn gửi `repo_url` để server chuẩn hóa; không hứa phân tích nhánh tùy ý.
- Upload có kéo thả và chọn file bằng bàn phím. Sai đuôi: `ERR_UPLOAD_INVALID`; vượt `CONFIG.MAX_UPLOAD_BYTES`: chặn trước request bằng thông điệp Upload. Gửi FormData trường `archive`, không tự đặt multipart boundary.
- IngestOverlay hiển thị đồng hồ thật, khóa input/dropzone. Đây là thời gian chờ, không phải phần trăm tiến độ server. Lỗi đóng overlay và hiện thông điệp, `retryable` có nút thử lại.
- Thành công: thay dữ liệu phiên theo YC-11, lưu `sf.last_session`, vào URL phiên, `active_node_id=null`, tự mở Tổng quan. Resume có toast số node đã hoàn thành/tổng.
- SessionList dùng `LearningSessionSummary`, mới nhất trước: `repo_name · ref_label @ sha7`; ref rỗng dùng `repo_name · @ sha7`; `ARCHIVE_HASH` thêm zip, hiển thị subdir khi có. Hàng dưới: completed/total, failed, thời gian hoạt động.
- `can_resume`: Học tiếp gửi `{ session_id }`; Học lại từ đầu xác nhận tiến độ node làm lại, kỹ năng giữ nguyên, câu hỏi mới rồi gửi `{ session_id, restart: true }`. `ENGINE_UPDATED`: chip + Xem lịch sử, không gửi resume như phiên hợp lệ.

### YC-07 — Shell và header

Nguồn: spec/30 Mục 2.2–2.3; D-78, D-79.

- Shell gồm Navbar, CockpitHeader, LessonGraphPanel, CodeSnippetViewer + ProblemsPanel, LearnSidePanel với X-Ray/Feynman. Trên desktop vừa chiều cao màn hình, các cột cuộn riêng. Không để Navbar cộng thêm chiều cao gây tràn toàn trang.
- Header hiển thị metadata như YC-06, archetype/framework, Monorepo hoặc Repo lớn dựa response; thời gian `ingest_ms + engine_ms`, chi tiết code_file_count, quota và chi phí theo YC-15. Lấy fingerprint/report đúng đường dẫn trong `ClientStaticEngineResult`.
- Đổi thư mục chỉ cho phiên GitHub online có monorepo/selective_fetch: nhập thư mục, gửi `repo_url` và `subdir_override`, thành công thay phiên/URL. Zip và offline không có nút này.
- Repo khác: xóa phiên, `sf.last_session`, queue và state UI gắn phiên; giữ profile, về `/`. Request cũ không được áp lại.
- Chưa chọn node: code nhắc chọn node Sẵn sàng; cột phải có nút mở Tổng quan. Không tự chọn node chỉ vì đóng modal.

### YC-08 — DAG và cảnh báo

Nguồn: spec/30 Mục 4; INV-10, INV-11; T1, T20, T32, T35.

- ReactFlow dùng tọa độ engine, không chạy layout lại; `nodesDraggable`, `nodesConnectable`, `elementsSelectable=false`. Mở vừa khung nếu đọc được, nếu không phóng quanh node đang mở/AVAILABLE đầu; chọn bài đưa node vào vùng nhìn.
- Màu + icon + chữ: LOCKED xám viền đứt/khóa/Chưa mở; AVAILABLE amber/Sẵn sàng; COMPLETED xanh/tích/Hoàn thành; FAILED đỏ/chéo/Chưa đạt. Soft-bypass vẫn do server; không đổi đỏ thành vàng để ôn.
- `has_warning` có tooltip nêu cha FAILED/phân tích lỗi. Trạng thái phân tích PENDING/FAILED là lớp riêng, không ghi đè NodeStatus. Retry phân tích là nút riêng, không vô tình kích hoạt mở bài.
- Capstone và ALGORITHMIC_CORE có huy hiệu. Node được chọn viền `--ink`. Tên `DOMAIN_TERMS`, `DIRECTORY`, `FILE_BASENAME` thêm `~`; cắt bằng `CONFIG.TITLE_MAX_CHARS`; tooltip tên đủ, evidence và “Tên suy ra — gần đúng”. VIRTUAL giải thích chặng tách từ hàm dài. Có dòng số file/ngôn ngữ.
- RESOLVED nét liền; INFERRED nét đứt + nhãn cạnh suy luận. Màu nét theo nguồn COMPLETED/FAILED; lớp chuyển động riêng theo spec/30, không dùng `animated` để đổi nghĩa nét đứt. Reduced motion bỏ lớp chuyển động.
- Đầu cột: node count, `fingerprint.graph_confidence` HIGH/MIXED/LOW → Cao/Vừa/Thấp, language_breakdown theo code_bytes và nhãn suy luận khi STRUCTURAL, framework; report.degraded_mode → Repo tuần tự.
- Dùng `result.ingestion_report.skipped`: bộ đếm garbage/binary/oversized/unsupported_lang/quota/parse_error, không phải danh sách tên file. Nhãn “Đã che {redacted_secret_count} nội dung nhạy cảm”. Hiện truncated, warnings và omitted_node_count; cảnh báo LOW không đóng được, không tạo cảnh báo từ mục tiêu thời gian engine chưa đo.
- LOCKED vẫn nhận focus để đọc tooltip/aria-disabled nhưng click/Enter/Space không mở và không request. Các node khác mở qua YC-11. Chú giải đủ trạng thái, cảnh báo và loại cạnh.

### YC-09 — Monaco và Problems

Nguồn: spec/30 Mục 5, UI-31–33; T22, T39.

- Tự host `monaco-editor`, cấu hình loader và worker cùng origin, không CDN. Monaco/ReactFlow tải dynamic trong client boundary với SSR tắt; có loading/error/retry, không lỗi window khi build.
- `buildSliceModel` ghép tiêu đề bước, snippet, dòng trống và DTO cuối. Tiêu đề gồm số bước, layer, file, hàm, origin_note; dùng `#` cho Python, `//` cho nhóm JS/TS. lineMap lấy từng phần tử `snippet_line_map`, không suy ra liên tục từ line_start. Tiêu đề/marker/dòng trống/DTO không số gốc; marker mờ. stepRanges theo số bước của contract.
- Map ngôn ngữ theo spec/30 Mục 5, gồm TSX→typescript, JSX→javascript, PYTHON→python; không biết → plaintext. Không suy diễn hỗ trợ engine từ khả năng tô màu Monaco.
- `readOnly`, `domReadOnly`, glyphMargin; tắt minimap/contextmenu/scrollBeyondLastLine và chẩn đoán TS/JS. Đổi theme theo ứng dụng. Dọn model, listener, decoration khi thay/unmount; không tích lũy tài nguyên qua các node.
- Tô bước chọn amber, weak point đỏ + cảnh báo/tooltip nguồn AI, CODE_POINTER violet + bóng đèn. Bấm chip bước/X-Ray/Problems → active_step và revealLinesInCenter; bấm dòng Monaco → bước tương ứng. Không đổi bước theo scroll, không chọn bước từ dòng DTO không thuộc trace.
- Thanh code có file/hàm/layer/dòng/origin_note, chip bước, nút Trình chiếu; chân có chú giải màu và ý nghĩa dòng gốc.
- Problems mặc định ẩn: tab Điểm dở — Nhận định của AI (what, vị trí, step, skill, không fix) và Luồng (bước/layer/hàm/file); chọn dòng đồng bộ Monaco.

### YC-10 — X-Ray

Nguồn: spec/30 Mục 6.1, UI-47; spec/22 BKT-24; T5, T23, T40.

- Thứ tự: thông tin node → kỹ năng → kiến trúc → luồng → điểm hay → điểm dở → liên quan → chỉ số → hành động.
- Kỹ năng: dùng getDecayedMastery/tierOf với `now = Date.now() + server_clock_offset_ms`; định dạng điểm theo spec/30. Thanh dài theo điểm decay, độ đậm theo tỷ lệ decay/điểm gốc; “đang mài mòn” chỉ khi rớt tier. Tooltip lý do, symbol, bước và dòng; bấm chọn bước. Không ghi lại điểm decay hoặc đổi màu node.
- Pattern/summary theo analysis.architecture; luồng lấy analysis.steps và trace_steps. `text=null` bỏ giải thích, không tự sinh. ALGORITHMIC_CORE có stepper ALGO_SETUP/ALGO_EXECUTION/ALGO_TERMINATION, chặng trống mờ.
- Điểm hay/điểm dở gắn bước và vị trí; what/consequence plain text, không fix hay con số tình huống. Danh sách rỗng hiển thị trạng thái chưa có nội dung, không coi là chứng nhận code không lỗi.
- `shared_files` hiện Liên quan và chip node; LOCKED vẫn tuân thủ YC-08. Chỉ số từ uncle_bob gồm diagnosis/is_exempt và cognitive_complexity, không tự tính lại.
- Chưa phân tích/PENDING: khung trace + chờ; lỗi: retry. `skeleton_only`: nhãn “AI chưa giải thích được node này — chỉ hiện khung do code dựng”, ẩn Kiến trúc, giữ kỹ năng/khung đã có.
- AVAILABLE chưa xong run: Bắt đầu trả lời, số câu chưa xong trừ DROPPED nếu đã có run; enrich đang chạy/lỗi hiện chờ/thử lại. COMPLETED/FAILED: không nút ôn, chỉ trạng thái và hướng dẫn xem Feynman chỉ đọc.

## 4. Điều phối phiên và vòng học

### YC-11 — Store, hàng đợi và mở node

Nguồn: spec/30 Mục 7.1, 7.3–7.4; UI-73, UI-74; D-46.

- Workbench là nơi sở hữu session/result/progress/analyses/runs/overview/profile/clock offset của UI mới. Theme/layout ở store riêng. Không dùng userStore cũ làm bản profile/token cạnh tranh. UI tạm dùng tên slice ở spec/30 Mục 7.1; các tên hiện có khác được ánh xạ khi triển khai, không sửa public contract.
- Ingest thay phiên/result/progress/analyses, reset runs/overview/nháp/kết quả/gợi ý/lựa chọn; hàng khởi tạo theo spec/30 Mục 7.3. Giữ hồ sơ online khi đổi repo.
- Queue theo D-46: node đang mở và nhóm kế tiếp theo tô-pô (hòa theo id), bỏ bản phân tích đã có; concurrency lấy CONFIG. Đổi lựa chọn thay ưu tiên, không tải toàn bộ repo. Node vào queue mới hiện PENDING.
- Analyze thành công áp analysis hoặc FAILED khi null và áp response YC-12. Lỗi khác đánh dấu phân tích FAILED rồi tiếp tục queue; quota dừng queue, các node chờ thành FAILED. Không tự đặt `analysis_failed` của tiến độ khi chỉ lỗi mạng: giá trị đó từ server. Retry đưa node lên đầu queue.
- Mở node hợp lệ: active_node_id, active_step là bước đầu, active_tab=XRAY, xóa active_question_index/hint_step/submit_error, đóng Tổng quan. Chưa có analysis đưa lên đầu queue.
- Enrich chỉ cho node đang mở có analysis, không pending trùng, chưa có run đang dở trong store, và AVAILABLE chưa có run hoặc server có last_run chưa kết thúc. Mode LEARN; bản phân tích về sau chỉ enrich nếu node vẫn đang mở. Chọn câu chưa xong đầu khi response về cho node đang mở.
- Node đã xong dùng run trong store hoặc last_run chỉ đọc, không tạo run mới. Phục hồi run do lỗi đồng thời là nhánh riêng ở YC-12.
- Mỗi thao tác giữ ngữ cảnh phiên/chế độ và thế hệ phiên tại lúc gửi. Đổi session, logout, bật/tắt offline vô hiệu hóa ngữ cảnh cũ, kể cả quay lại cùng id. Bỏ response cũ; response node không còn chọn chỉ cập nhật dữ liệu đúng node, không giành lại focus/tab/câu. Cleanup request cũ không được xóa pending của request mới.

### YC-12 — Áp response và phục hồi lỗi

Nguồn: spec/30 Mục 7.5, UI-76–77; spec/02 Mục 8; T12, T16, T17, T28.

UI gọi các hàm `…Safe` của api.ts, kiểm `ok` trước khi đọc data. apiFetch hiện tại có thể throw; không đổi chữ ký hàng loạt. Với ApiResult lỗi, lấy ApiError ở `result.error`, rồi `error.message` bên trong object đó.

| Response/sự kiện | Cập nhật và hành động tiếp |
| :-- | :-- |
| Ingest | Thay phiên theo YC-11, lưu metadata from_cache để hiển thị đúng |
| Analyze/enrich/evaluate/reveal/report | Nếu có node_state thay progress.nodes đúng node; có tokens_used thay quota; có question thay questions[k].state theo question_index, không giả định index mảng |
| Enrich | Lưu EnrichNodeResponse theo node_id; không áp QuestionState trực tiếp như QuestionView |
| Evaluate | Lưu kết quả theo run_id:question_index, cập nhật last_failed_answers khi trượt; không tăng lượt ngoài response |
| skill_change khác null | Lưu chip thay đổi rồi GET /api/me; profile online chỉ thay từ MeResponse/PersonaResponse |
| unlocked_node_ids không rỗng hoặc status thay đổi | GET /api/sessions/{id}/progress, thay progress toàn phiên để đồng bộ cảnh báo cha/con; đánh dấu hiệu ứng node vừa mở |
| Báo sai, skill_change null | Ghi nhận disputed và node_state; không dựng chip hoàn điểm giả; refresh progress theo điều kiện trên |
| ERR_ATTEMPT_OUT_OF_SYNC / ERR_QUESTION_FINISHED | Tải lại run qua enrich, giữ nháp, toast vừa nộp ở tab khác; nếu ERR_NODE_NOT_AVAILABLE thì refresh progress và dùng last_run |
| ERR_PERSISTENCE_UNAVAILABLE / lỗi AI khi chấm | Giữ nháp và lượt; không biên nhận localStorage; cho thử lại cùng attempt_number |
| ERR_UNAUTHENTICATED | Refresh session rồi gửi lại một lần; vẫn lỗi về màn đăng nhập; không retry vô hạn hoặc refresh Supabase trong offline |

### YC-13 — Feynman, bỏ qua, báo sai và tổng kết

Nguồn: spec/30 Mục 6.2, UI-52, UI-54, UI-57–58; spec/20 AI-31; T2, T4, T6, T8–T12, T25, T40.

- Feynman tắt khi chưa chọn node/chưa có analysis, có tooltip. Đang enrich: chờ; lỗi có thử lại. Chuyển X-Ray không mất nháp, code vẫn hiện.
- Hiện skill/tier/focus/feynman_question, trạng thái câu và lượt từ QuestionView.state. Icon cho chờ, đang trả lời, PASS_*, FAILED, disputed, DROPPED. DROPPED ghi “AI không đặt được câu này — không tính”, không tự cập nhật BKT và bỏ khỏi tổng kết đạt/trượt.
- Nháp/last_failed_answers theo run_id:question_index trong RAM. Validate bằng helper similarity hiện có: độ dài không khoảng trắng tối thiểu, maxlength, trùng câu sai trước; lỗi dưới ô, không request/không mất lượt. Nộp rỗng tắt; Ctrl+Enter dùng cùng handler.
- Request evaluate chứa session_id/run_id/question_index/student_answer và attempt_number=state.attempts_used+1. Nút khóa ngay để không gửi trùng; mở lại khi đã nhận kết quả/lỗi và qua CONFIG.SUBMIT_DEBOUNCE_MS tính từ lúc gửi.
- Hết quota: ô/Nộp tắt và giải thích; vẫn đọc phân tích/đáp án đã có và Bỏ qua. Không chặn reveal bởi quota AI.
- Eval hiện core_accuracy với vạch CONFIG, simplicity dạng số, feedback/jargon, các cờ points_covered. Khi chưa xong không có chữ must_have_points. CODE_POINTER chọn/cuộn bước; CONCEPT không tô một bước giả, xóa highlight gợi ý cũ khi đổi câu/node. OFF_TOPIC thông báo mất lượt, không gợi ý; GIVE_UP thông báo một lượt chưa đạt theo response.
- Câu xong ẩn ô; reveal chỉ từ question.reveal với nhãn nguồn, ý bắt buộc và fix. Có points_covered của lần cuối thì ✓/✗, không có thì •. Hiện chip skill_change và tier trước/sau theo định dạng spec; có Câu tiếp theo.
- Bỏ qua: xác nhận sẽ tính CHƯA ĐẠT và mở đáp án; gửi POST /api/reveal với định danh câu hiện tại. Áp YC-12; lỗi giữ trạng thái cũ. SKIP không có Báo sai.
- Báo sai chỉ khi outcome=FAILED, ended_by=ANSWER, chưa disputed; ghi chú tối đa CONFIG.REPORT_NOTE_MAX_CHARS. Thành công gắn cờ, toast đã ghi nhận; điểm được hoàn nếu chưa có cập nhật khác, chỉ hiển thị thay đổi có trong response. Offline nút hiện nhưng tắt.
- Tổng kết run lấy node_state, không tự suy từ màu: skill đạt/trượt/disputed, không DROPPED; hoàn thành có chip node vừa mở, thất bại giải thích node sau vẫn mở với cảnh báo.
- Run đã xong còn trong store giữ câu/kết quả/reveal/Báo sai hợp lệ. Sau reload: RunReadOnly dùng last_run, không tự dựng lại feedback đã mất, không ô trả lời/ôn tập.

### YC-14 — Tổng quan và offline

Nguồn: spec/30 Mục 6.3, 7.3, 8–9; UI-60, UI-62, UI-74, UI-78; T14, T18–T19, T23, T33–T34.

- Tổng quan mở sau ingest khi chưa chọn node, mở lại bằng nút header; không thêm phím tắt chưa có đặc tả. Facts ban đầu dùng result và helper overview: archetype/framework/tech_stack, mọi node gốc, mainPath, bản đồ tầng; không gọi AI ở bước này.
- Đã phát hiện gom patterns/skills/weak_points từ analyses; bộ đếm gồm bản phân tích và analysis_failed từ server. Không coi lỗi mạng cục bộ là phân tích đã kết thúc trên server.
- Khi tất cả node đạt điều kiện trên, gọi analyze-overview có chặn trùng theo phiên, không chờ học xong. ERR_OVERVIEW_NOT_READY chờ lần phân tích tiếp theo; lỗi khác cho retry chủ động, không polling vô hạn. Response có facts thì thay facts; ai có thì nhãn nguồn và nội dung, ai=null giữ Đã phát hiện. Chip LOCKED không mở bài.
- Bật offline bằng nút, Ctrl+Shift+D (preventDefault), ?offline=1. Nút trang chủ vào learn, phím tắt giữ trang. Nhãn “Chế độ Offline — dữ liệu ghi lại, không lưu tiến độ” luôn thấy kể cả trình chiếu, tooltip recorded_from.
- Nạp và kiểm bundle trước khi chuyển sang offline hoàn chỉnh; hỏng thông báo “Không đọc được gói demo Offline…”, không để state nửa online/nửa offline. Dữ liệu là bản ghi API đã duyệt, không sửa bundle/đáp án để khớp test.
- Vào offline lấy phiên/result/analyses/overview từ bundle; hồ sơ từ PERSONAS, mặc định NEWBIE; progress bằng hàm thuần. Không khởi tạo/gọi Supabase hoặc /api/*; tắt báo sai, persona API, lịch sử và thao tác tài khoản online. Asset/bundle cùng origin vẫn cần tải.
- Key enrich/scripted_answers/reveals theo OfflineMockBundle của spec/02 Mục 10. Thiếu key thông báo không có kịch bản. Chấm chọn câu có similarity cao nhất đạt CONFIG.ANSWER_DUPLICATE_SIMILARITY; không khớp báo chỉ chấm được kịch bản, không mất lượt.
- Câu xong dùng computeSkillChange; run xong dùng nodeStatusFromRuns/deriveNodeStates. Không lấy điểm/node_state ghi sẵn trong bundle để ghi đè kết quả persona hiện tại. Không ghi DB hoặc tiến độ localStorage.
- Bật offline khi đang có request: vô hiệu hóa response online cũ, chặn request mới và dừng tác vụ auth nền. Tắt offline xóa state demo, chạy lại Boot online; cập nhật cờ URL để Boot không bật demo lại ngoài ý muốn.
- Điều kiện demo ngắt mạng: nạp app, bundle và UI động cần dùng trước khi ngắt; xác minh trên trình duyệt. Không cam kết mở mới app chưa có asset khi mất mạng; không thêm PWA/service worker vào phạm vi này.

### YC-15 — Báo cáo và trang phụ

Nguồn: spec/30 Mục 2; spec/02 MeResponse, HistoryResponse, SessionProgress; T31 và FE-10 trong PLAN.

- Report thống kê node theo progress, completed/total; không tính lại FSM. Tổng bằng không hiển thị “Chưa có dữ liệu”, không chia cho không.
- Bảng “Kết quả nộp bài trong phiên”: mỗi skill, số lượt có is_passed / tổng lượt có trong HistoryResponse; nhãn là tỷ lệ lượt nộp đạt, không phải xác suất BKT hay tỷ lệ câu hoàn tất. Không lấy dữ liệu DB riêng hoặc dựng kết quả câu bị bỏ qua từ lịch sử lượt nộp.
- Bảng “Năng lực cá nhân”: skills từ profile của người học dùng chung các repo, phân biệt điểm gốc/decay theo YC-10; không mô tả là năng lực chỉ học từ phiên này.
- Token từ progress. Contract chỉ có tổng token: chi phí hiển thị khoảng ước tính dùng tổng token với hai đơn giá input/output của CONFIG làm cận, đổi theo đơn vị “mỗi triệu” của tên hằng. Tooltip ghi “ước tính theo tổng token; chưa biết phân bổ vào/ra, không phải chi phí thực thanh toán”. Không giả định tỷ lệ vào/ra cố định; offline hiện token theo spec/30.
- Không có radar năm trục trong phần bắt buộc vì chưa có công thức/ánh xạ chuẩn; không thêm điểm tổng hợp, người dùng hay số đo giả.
- Trang how-it-works là nội dung tĩnh, không tuyên bố hỗ trợ engine đã kiểm chứng ngoài phạm vi spec và không hứa hiệu năng chưa đo. Roadmap/history theo YC-04.

## 5. Hệ thống giao diện và thành phần

### YC-16 — Theme, bố cục, truy cập và chuyển động

Nguồn: spec/30 Mục 2.2, 11; D-67, D-79; T29, T32, T36–T41.

- Token màu lấy bảng spec/30 Mục 11; tài liệu này không sao chép mã màu. Khai báo CSS vars theo html[data-theme], mặc định dark; map Tailwind bằng @theme inline, không tạo tailwind.config.ts. Font Plus Jakarta Sans và JetBrains Mono theo spec.
- Đủ --bg/--panel/--panel-2/--text/--muted/--subtle, màu trạng thái, --accent/--accent-2, --ink, --line*, --on-amber, nhóm --st-{done,ready,fail,lock}-{bg,border,fg}, focus/disabled và theme Monaco. Trạng thái giữ nghĩa ở cả hai theme.
- Theme script đọc prefs trước khi vẽ, xử lý storage bị chặn/JSON hỏng, không ghi đè layout; kiểm FOUC bằng reload thực tế. Không dùng khẩu hiệu bảo đảm tuyệt đối thay bằng chứng.
- .glass chỉ toast/popover/hộp thoại theo spec; cột và node nền đặc. Taste Skill hỗ trợ typography/căn lề/feedback tương tác khi không trái spec; giữ violet/accent đã quy định, không ép bố cục landing page vào cockpit. Chỉ thẻ có tương tác mới dùng affordance hover.
- Desktop từ lg: các cột cuộn riêng, Problems mặc định ẩn. Splitter kéo chuột/chạm/phím mũi tên, double-click/Home/Enter reset; mặc định/giới hạn dùng LAYOUT_DEFAULT/LAYOUT_LIMIT nội bộ theo spec, lưu prefs.layout. Ctrl+B bản đồ, Ctrl+Alt+J Problems, Ctrl+Alt+B cột phải; tránh hotkey trùng khi remount.
- Dưới lg: bản đồ → code → Problems nếu bật → X-Ray/Feynman, một cột cuộn dọc; ẩn menu bố cục/splitter, không tràn ngang toàn trang.
- Trình chiếu: chiều rộng code/font theo CONFIG, phần còn lại chia đều cột còn hiện; cột đã ẩn vẫn ẩn; ẩn splitter, giữ header và nhãn offline. Esc/Thoát trả tỷ lệ trước trình chiếu, không ghi đè prefs bằng tỷ lệ tạm.
- Modal/drawer: focus ban đầu phù hợp, trap focus, Esc đóng, trả focus về nút mở, khóa cuộn nền; tiêu đề/nút luôn thấy, thân cuộn. Tooltip dùng được qua focus, tabs có điều hướng bàn phím, splitter có vai trò/nhãn/giá trị truy cập.
- Node focus theo thứ tự result.nodes; Enter/Space gọi cùng handler click; Ctrl+Enter nộp; focus ring luôn thấy. aria-label node nêu tên/trạng thái/cảnh báo/phân tích; aria-live polite cho lỗi/kết quả/toast.
- Kiểm tương phản WCAG AA theo yêu cầu spec trên các nền và cả hai theme; chữ trên amber dùng on-amber. Reduced motion tắt rung, shimmer, nhịp sáng, chuyển động cạnh/khung; nội dung vẫn hiện. Kiểm header, modal, câu dài và đồ thị ở kích thước T32/T36/T41 trong spec/50.

### YC-17 — Ranh giới thành phần

Các đường dẫn dưới đây tính từ gốc repo; file không tồn tại được tạo bởi task tương ứng, không phục hồi tự động bản UI đã bị xóa.

| Nhóm | Thành phần và trách nhiệm | Task PLAN |
| :-- | :-- | :-- |
| app + layout | Root layout, Boot, Navbar, LoginScreen, routes; auth callback chỉ tái sử dụng | 1.1, 2.1–2.3 |
| home | Home, DropZone, IngestOverlay, SessionList; HeroArt chỉ trang trí không số liệu giả | 3.1–3.2 |
| learn shell | LearnShell, CockpitHeader, LearnSidePanel, trạng thái chưa chọn/lỗi | 3.3 |
| canvas | DagCanvas, GraphNodeCard, FlowEdge, LessonGraphPanel | 4.1 |
| code | slice-model, MonacoPane, CodeSnippetViewer | 4.2 |
| analysis | XRayPanel/SkillChips, ProblemsPanel, RepoOverviewModal | 4.3–4.4 |
| feynman | FeynmanQuestionSection, FeynmanEvaluation, RevealSection, SkipConfirmDialog, ReportWrongModal, RunSummary, RunReadOnly | 5.1–5.3 |
| layout controls | Splitter, LayoutControls, useLayout; learn/layout chứa mặc định/giới hạn nội bộ | 6.2 |
| ui | Button/Input/Badge/Card/StatusPill, Modal/Drawer/Tabs/PlainText/Toasts; PageHeader/MetricCard/EmptyState | 1.2 |
| state/helpers | workbench; useTheme/useLayout riêng; api/messages/offline/overview helpers tái sử dụng | 1.3, 2.1, 2.4, 4.3, 5.2 |
| secondary pages | roadmap, history, report, how-it-works | 6.1 |

## 6. YC-18 — Xử lý lỗi và thông điệp

Nguồn: spec/02 Mục 9; spec/30 Mục 10. Tái sử dụng ERROR_MESSAGES/formatErrorMessage; Record<ErrorCode, …> kiểm đủ mã tại compile time. Nội dung chuẩn ở spec/30; bảng dưới ánh xạ hành vi, không tạo mã mới. Với ApiError dùng error.message; ApiClientError là lớp Error có thêm trường error, không nhầm hai cấu trúc.

| Mã | Hành vi UI |
| :-- | :-- |
| ERR_INVALID_GITHUB_URL | Lỗi dưới URL, viền đỏ |
| ERR_PREFLIGHT_404_OR_PRIVATE | Giải thích repo công khai hoặc upload theo thông điệp chuẩn, nhấn vùng thả |
| ERR_NETWORK_TIMEOUT | Lỗi ingest, thử lại theo retryable |
| ERR_BRANCH_NOT_FOUND | Kiểm nhánh mặc định, không khuyên dùng /tree/ |
| ERR_EMPTY_REPOSITORY | Báo repo chưa có commit |
| ERR_REPO_UNAVAILABLE_451 | Báo repo bị hạn chế truy cập |
| ERR_GITHUB_RATE_LIMIT_CDN | Thử lại sau hoặc upload zip |
| ERR_STREAM_TIMEOUT | Thử lại hoặc upload |
| ERR_STREAM_CORRUPTED | Báo tải gián đoạn/zip hỏng, thử lại |
| ERR_STREAM_QUOTA_EXCEEDED | Phân biệt thông điệp upload với tải repo theo CONFIG; không khuyên dán /tree/ |
| ERR_UNSUPPORTED_LANGUAGE | Nêu details.language, không hứa hỗ trợ chưa kiểm chứng |
| ERR_NO_SOURCE_FILES_FOUND | Dịch details.hint theo spec/30, không in mã thô |
| ERR_NO_ARCHITECTURAL_SLICE | Giải thích không có lát cắt, chọn repo/thư mục khác |
| ERR_UPLOAD_INVALID | Chọn zip hợp lệ |
| ERR_SERVER_BUSY | Giữ dữ liệu nhập, thử lại theo retryable |
| ERR_NODE_NOT_AVAILABLE | Refresh progress, chuyển hiển thị đúng trạng thái server |
| ERR_ANALYSIS_NOT_READY | Im lặng đưa node lên queue, analysis xong mới enrich nếu còn mở |
| ERR_OVERVIEW_NOT_READY | Chờ phân tích tiếp theo, không polling vòng lặp |
| ERR_QUESTION_FINISHED | Tải lại run/progress theo YC-12, giữ nháp |
| ERR_ATTEMPT_OUT_OF_SYNC | Tải lại run, giữ nháp, toast hai tab |
| ERR_ANSWER_TOO_SHORT | Dưới ô, dùng CONFIG, không tự trừ lượt |
| ERR_ANSWER_TOO_LONG | Dưới ô, giữ nháp |
| ERR_ANSWER_DUPLICATE | Yêu cầu ý mới; rung khi không reduced motion |
| ERR_ANSWER_INAPPROPRIATE | Yêu cầu diễn đạt lại, không mất lượt |
| ERR_REPORT_NOT_ALLOWED | Tải lại run/progress và ẩn Báo sai khi không còn hợp lệ |
| ERR_AI_UNAVAILABLE | Thông điệp theo bước phân tích/đặt/chấm; retry, giữ lượt |
| ERR_AI_REJECTED | Retry đặt câu hỏi; với tổng quan giữ facts và lỗi phù hợp |
| ERR_TOKEN_QUOTA_EXCEEDED | Thanh đỏ, dừng queue, khóa Nộp; Bỏ qua vẫn dùng được |
| ERR_UNAUTHENTICATED | Refresh + gửi lại một lần theo YC-12 |
| ERR_SESSION_NOT_FOUND | Xóa phiên lưu, lỗi + về trang chủ |
| ERR_SESSION_ENGINE_OUTDATED | Chỉ xem lịch sử, quét lại để học |
| ERR_PERSISTENCE_UNAVAILABLE | Giữ nháp/lượt, không biên nhận, retry |
| ERR_DEMO_MODE_DISABLED | Toast, không tự đổi profile |
| ERR_CLIENT_NETWORK | Lỗi kết nối, retry; Boot có mở demo |

## 7. Truy vết và nghiệm thu

Mỗi YC phải có task và test trong PLAN Mục 4. Mã T giữ nguyên spec/50 Mục 6, không lấp các mã đã khuyết bằng test khác. FE là kiểm bổ sung cho hành vi tích hợp, không thay test gốc. Chỉ ghi đạt khi có kết quả thực; không suy ra nghiệm thu browser từ Vitest.
