# 08 — Câu hỏi chờ chốt

> Mỗi câu có **mặc định**. Không ai trả lời trước hạn thì đội làm theo mặc định, không dừng lại chờ. Mặc định nào đổi spec thì sau cuộc thi ghi thành dòng D-xx trong `docs/spec/00_QUYET_DINH.md` (theo `07_ke_hoach_21h.md` Mục 3). Trong giờ thi không sửa spec.
> Cột "Trả lời" để trống cho trưởng nhóm điền.
> **Trưởng nhóm** là người đội đã chọn làm trưởng nhóm (đề bài không ghi tên). Nếu lúc 11:00 chưa rõ ai thì Thiện quyết thay. Mọi câu ở Mục 1 có **một hạn chung: 11:30**.

## 1. Phải trả lời trước 11:30 ngày 07/11

| Mã | Câu hỏi | Mặc định | Ảnh hưởng nếu đổi | Ai trả lời | Trả lời |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Q-18 | Repo tập dượt `demo-HackathonSGU-2026` đang **public**, trong khi kế hoạch cũ ghi repo tập phải private. Có đổi sang private không? | Trợ lý không đổi. **Trưởng nhóm tự quyết** | Repo public chứa code gần giống sản phẩm thi, BTC có thể coi là code chuẩn bị trước | Trưởng nhóm | |
| Q-01 | Ngừng code lúc 09:00 (thể lệ) hay 12:00 (trưởng nhóm nói)? | **09:00**, nộp file trước 09:30. Nếu BTC cho làm muộn hơn thì là phần dư, không đưa vào kế hoạch | Không đổi lịch | Thiện hỏi BTC lúc 11:00 | |
| Q-02 | Repo demo: giữ Q-03 (Java Spring `gothinkster/spring-boot-realworld-example-app`) hay đổi sang repo TS/JS? Repo TS/JS dự phòng là repo nào? | Giữ Q-03, **chốt ở cổng G5 lúc 23:00**. Repo dự phòng do Minh chọn trước 11:30. Gợi ý: repo đã chạy ở buổi tập là `gothinkster/node-express-realworld-example-app` (`review/loi_da_gap.md`, 12 bài); kích thước và ngôn ngữ **CHƯA KIỂM CHỨNG** lại | Chọn TS/JS ngay từ đầu thì bỏ được MI-08, giảm rủi ro lớn nhất | Minh + trưởng nhóm | |
| Q-05 | Hạ `CONFIG.ANSWER_MIN_CHARS` từ 15 xuống 5, và nút Nộp không bao giờ tắt vì câu ngắn? (K1) | **Áp dụng** | Giữ 15 thì giám khảo gõ "em không biết" không nộp được. Đổi thì test lấy từ spec (giả định 15) phải sửa số | Trưởng nhóm (Nhân đề xuất) | |
| Q-06 | Nâng `CONFIG.ANSWER_DUPLICATE_SIMILARITY` từ 0.8 lên 0.95? (K2) | **Áp dụng** | Giữ 0.8 thì sửa vài chữ vẫn bị chặn. Đổi thì: (1) Offline cũng khó khớp hơn (dùng chung hằng số), câu gõ trên sân khấu phải gần y hệt kịch bản; (2) test lấy từ spec (giả định 0.8) phải sửa số | Trưởng nhóm (Nhân đề xuất) | |
| Q-07 | Sửa luật Đạt D-13: ý được tính khi AI báo `covered` **và** (trích dẫn khớp **hoặc** `core_accuracy ≥ CONFIG.PASS_CORE_ACCURACY`)? (K3) | **Áp dụng** | Giữ luật cũ thì người trả lời đúng có thể trượt vì AI chép trích dẫn lệch 1 dấu | Trưởng nhóm (Nhân đề xuất) | |
| Q-08 | `OFF_TOPIC` và `GIVE_UP` vẫn tính lượt nhưng luôn có gợi ý tĩnh `CODE_POINTER` (trái `spec/30` Mục 6.2: "lạc đề — mất 1 lượt, không có gợi ý")? (K4) | **Áp dụng** | Giữ spec thì gõ bậy 3 lần là bài đỏ, không có đường đi tiếp | Trưởng nhóm (Nhân đề xuất) | |
| Q-09 | Cổng gác chỉ **chặn** 3 lỗi (tên bịa, công nghệ ngoài repo, chèn lệnh); các kiểm khác của `spec/21` chỉ ghi log? (K5, K6) | **Áp dụng** | Giữ spec thì điểm dở dễ bị lọc hết, enrich chậm gấp đôi khi bị chặn | Trưởng nhóm (Nhân đề xuất) | |
| Q-03 | Bỏ staging S2, smoke test bot, cổng duyệt production, 2 image (D-30, D-64, D-72); thay bằng deploy tay `--source` lên 1 service? | **Áp dụng** | Giữ pipeline thì phải gỡ lỗi `deploy.yml` (chưa từng chạy được) trong giờ thi | Thiện | |
| Q-16 | Trưởng nhóm có chạy `gh run list --workflow deploy.yml` và `gh run view --log-failed` để xem lỗi deploy thật không? (Trợ lý không chạy vì người dùng dặn không đụng repo) | Nên chạy trước 11:00, ghi lỗi thật vào `05_DEPLOY_CLOUD_RUN.md` Mục 1 | Có log thật thì bẫy ở `05` Mục 3 chính xác hơn | Thiện | |
| Q-10 | Vai trên sân khấu: Nhân nói chính, Phát bấm, Thiện + Minh trả lời phản biện, slide Minh chính và Thiện dự phòng? | **Áp dụng** | Đổi người nói chính thì phải đổi lịch ngủ ở `04` Mục 5 | Trưởng nhóm | |

## 2. Có thể trả lời trong giờ thi

| Mã | Câu hỏi | Mặc định | Ảnh hưởng nếu đổi | Ai trả lời | Hạn | Trả lời |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| Q-04 | Vertex AI lỗi trên Cloud Run thì chuyển `GEMINI_BACKEND="studio"`, key để trong Secret Manager (trái D-66: không có `GEMINI_API_KEY` trên Cloud Run)? | **Có**, ở cổng G3 lúc 20:15 | Không chuyển thì demo trên Vercel hoặc Offline | Thiện + Nhân | 20:15 | |
| Q-11 | Màu lệch 3 bên: prototype xanh `#5aa9ff`, repo tập cam `#ff9640`, spec tím `#8b5cf6`. Theo bên nào? | **Theo `spec/30` Mục 11** (D-89 ghi "giữ màu, font của `30` Mục 11"); bố cục và nhãn theo prototype | Theo prototype thì sửa bảng token ở PH-01 | Phát | 12:45 | |
| Q-12 | Trên `/learn`, gộp `Navbar` + `CockpitHeader` thành 1 thanh như prototype (spec ghi 2 thành phần)? | **Gộp 1 thanh** theo prototype; các phần của `spec/30` Mục 2.3 nằm trong thanh đó | Giữ 2 thanh thì không giống prototype (ghi chú 5) | Phát | 15:45 | |
| Q-13 | NOVICE không nhận góc `WEAKNESS` (đổi luật kế hoạch câu hỏi `spec/22`)? | **Không áp** (giữ spec). Câu `WEAKNESS` của NOVICE hỏi "chuyện gì xảy ra với người dùng khi…" | Áp thì câu hỏi dễ hơn nữa, nhưng điểm dở ít được hỏi | Nhân | 13:30 (trước khi NH-03 viết `plan.ts`) | |
| Q-14 | Bản dùng trên sân khấu bật `DEMO_MODE` để đổi persona online (phút 3:50)? | **Không** (production giữ `DEMO_MODE="false"`). Phần mài mòn làm trong Offline | Bật thì phải deploy thêm 1 service hoặc đổi biến sát giờ | Thiện | 23:00 | |
| Q-15 | Áp phích: kích thước, nơi đăng (fanpage nào), hạn đăng, ai đăng? | Quý làm bản cuối lúc 04:00; người đăng do BTC quy định | Đăng muộn thì mất phần điểm tương tác (10%) | Thiện hỏi BTC | 11:30 | |
| Q-17 | File thuyết trình có được làm khung trước giờ thi không (không phải code)? | **Chỉ làm trong giờ thi** (MI-12, 05:30–07:30) | Được làm trước thì Minh đỡ 1 giờ | Thiện hỏi BTC | 11:30 | |
| Q-19 | Cắt resolver Python từ đầu (INV-09 ghi TS/JS và Python là 2 ngôn ngữ đã kiểm chứng)? | **Cắt.** Pitch không nói "đã kiểm chứng Python" | Giữ thì thêm 1–2 giờ engine | Minh | 13:00 | |
| Q-20 | Bỏ ReactFlow và Dagre (`spec/04` Mục 16 có liệt kê) vì `spec/30` Mục 4 không vẽ đồ thị? | **Bỏ**; `position` gán theo tầng tô-pô | Giữ thì nặng bundle, không hiện gì thêm | Minh + Phát | 13:00 | |
| Q-21 | Chuyển 16 thẻ khái niệm (D-81) từ popover trong X-Ray sang trang `/how-it-works` (mảng độc lập)? | **Chuyển** | Giữ trong X-Ray thì trang học phụ thuộc mảng độc lập (trái ràng buộc) | Phát | 13:00 | |
