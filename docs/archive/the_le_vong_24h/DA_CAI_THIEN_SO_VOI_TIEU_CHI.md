# Đã cải thiện so với tiêu chí — Chấm điểm dự kiến sau D-64, D-30, D-65, D-66

> **Nguồn:** báo cáo chấm điểm nội bộ (TASK_13, lập và kiểm ngày 02/11/2026), chấm theo [`[Shared] TIÊU CHÍ CHẤM ĐIỂM VÒNG 24H & CHUNG KẾT.md`](<[Shared] TIÊU CHÍ CHẤM ĐIỂM VÒNG 24H & CHUNG KẾT.md>) và so với bản đối chiếu cũ [`DOI_CHIEU_TIEU_CHI_24H.md`](DOI_CHIEU_TIEU_CHI_24H.md).
>
> **Cách đọc:**
> - Mọi điểm là **ước tính** của nhóm, không phải điểm giám khảo. Số đo (độ trễ, token, chi phí) đều là ước tính cho tới khi đo thật trong giờ thi.
> - Cột **Thiết kế** chấm những gì tài liệu `spec/` đã mô tả. Ý chỉ chấm được khi có sản phẩm thật (code sạch, giao diện chạy mượt, demo ổn định, thuyết trình) ghi "—".
> - 3 kịch bản **xấu / vừa / tốt** là điểm dự kiến khi thi, tùy mức code kịp trong 21 giờ.
> - Điểm bản đối chiếu cũ (~66,7) tính theo quy ước: Có = đủ điểm ý, Một phần = nửa, Không có = 0.
>
> **Lưu ý luật thi:** repo thi phải trống lúc bắt đầu và chỉ commit trong giờ thi mới được tính (`references/thele.md`). Mọi file trong repo thi (`ci.yml`, `deploy.yml`, Dockerfile, code) viết **trong giờ thi**. Trước giờ thi chỉ làm phần cấu hình ngoài repo (project GCP, IAM, WIF, Secret Manager, Supabase, Budget Alert) và thử trên repo nháp riêng.

---

## 1. Tổng quan điểm

Bảng tổng hợp điểm số đánh giá giữa Thiết kế đặc tả kỹ thuật và 3 kịch bản vận hành thực tế trong 21 giờ thi:
- **Kịch bản xấu (ước tính):** Chỉ hoàn thành lát dọc 1 (mốc H+8), phải cắt giảm tính năng theo Thứ tự cắt dự phòng Mục 3 `doc-de-hieu/07_ke_hoach_21h.md` (cắt resolver Java/Go/Dart, mobile D-57, entry ngoài TS/JS/Python D-58, tải chọn lọc D-63, nút Báo sai, màn hình lịch sử), deploy Cloud Run gặp sự cố phải chuyển sang chạy dự phòng trên Vercel Phương án C (mất điểm hạ tầng GCP VII).
- **Kịch bản vừa (ước tính):** Hoàn thành lát dọc 2 (H+12) + deploy Cloud Run thành công bằng lệnh `--source` (dùng Buildpacks), đạt mốc đóng băng H+17, nhưng chưa có test report đo thật F1/ROUGE/Latency p95 (chỉ có bảng duyệt tay demo và 13 ca test X-01..X-13), Dockerfile chưa kịp merge trước giờ cắt H+15 nên bị hủy.
- **Kịch bản tốt (ước tính):** Đạt đủ Definition of Done `spec/50` Mục 5 ở mốc H+17, có số đo thật (độ trễ p95, token, chi phí thực tế đo trên Cloud Run + Vertex AI), Dockerfile multi-stage standalone hoàn thành trên nhánh riêng và merge kịp trước giờ cắt H+15, pipeline CI/CD GitHub Actions chạy trơn tru deploy Staging S2 và Prod, kịch bản demo và video demo H+19 sẵn sàng, trình bày phản biện tốt.
- **Lưu ý về cột Thiết kế:** Các ý chỉ chấm được khi có sản phẩm thật (code đã viết, giao diện đã chạy, demo, thuyết trình gồm IV.1.b, IV.2.a, IV.6.b, và toàn bộ VIII) thì cột Thiết kế ghi **"—"** (chỉ chấm khi có sản phẩm). Tổng cột Thiết kế ghi dạng "x / y điểm chấm được từ tài liệu" (y = 85.5 điểm).

| Tiêu chí | Điểm tối đa | Thiết kế (ước tính) | Kịch bản xấu (ước tính) | Kịch bản vừa (ước tính) | Kịch bản tốt (ước tính) | Thay đổi so với đối chiếu cũ |
| :-- | :---: | :---: | :---: | :---: | :---: | :-- |
| **I. Tính sáng tạo & đổi mới** | 10 | 9.5 / 10 | 7.5 – 8.0 / 10 | 8.0 – 8.5 / 10 | 8.5 – 9.0 / 10 | Chuyển biến tích cực: Ý 3 chuyển từ "Không có" sang "Có" nhờ định vị giải quyết bài toán chống vibe-coding và kiến trúc Compound AI System. |
| **II. Tính thực tiễn & khả năng áp dụng** | 10 | 9.0 / 10 | 7.0 – 7.5 / 10 | 7.5 – 8.0 / 10 | 8.0 – 8.5 / 10 | Chuyển biến tích cực: Ý 3 chuyển từ "Một phần" sang "Có" nhờ triển khai Cloud Run sản xuất D-64 và chế độ Offline chạy cục bộ khi mất mạng. |
| **III. Dữ liệu & mô hình** | 20 | 19.25 / 20 | 13.0 – 14.5 / 20 | 15.0 – 16.5 / 20 | 17.5 – 18.5 / 20 | Tăng điểm: III.1 chuyển "Một phần" thành "Có"; III.3 xử lý thiên lệch & độc hại chuyển từ "Không có" thành "Có" nhờ D-65; III.2 và III.4 hoàn thiện rào chắn. |
| **IV. Cấu trúc, chất lượng triển khai & độ hoàn thiện** | 20 | 15.5 / 15.5 điểm chấm được | 11.5 – 13.0 / 20 | 15.0 – 16.5 / 20 | 17.5 – 18.5 / 20 | Tăng điểm: IV.4 staging S2 chuyển từ "Không có" thành "Có" nhờ D-30; IV.6 đóng gói Docker chuyển từ "Không có" thành "Có" nhờ D-64. (IV.1.b, IV.2.a, IV.6.b chỉ chấm khi có sản phẩm). |
| **V. Đóng góp & tính cộng đồng** | 10 | 10.0 / 10 | 7.5 – 8.0 / 10 | 8.0 – 8.5 / 10 | 9.0 – 9.5 / 10 | Giữ vững mức cao: Định hướng mã nguồn mở phi lợi nhuận giấy phép MIT (D-33, D-49), tự cài đặt (D-45), không thương mại hóa. |
| **VI. Sử dụng AI tiết kiệm chi phí và hiệu quả** | 10 | 10.0 / 10 | 6.5 – 7.5 / 10 | 8.0 – 8.5 / 10 | 9.0 – 9.5 / 10 | Tăng điểm: Ý 2 & 3 chuyển từ "Một phần" thành "Có" nhờ kết nối Vertex AI D-66, đo chi phí 2 tầng L1/L2, budget alert $20 và 3 con số cốt lõi. |
| **VII. Ứng dụng công nghệ AWS hoặc Google** | 10 | 10.0 / 10 | 2.0 – 3.0 / 10 | 7.0 – 8.0 / 10 | 8.5 – 9.5 / 10 | Tăng từ 0 điểm: Toàn bộ tiêu chí VII từ "Không có" (0 điểm) chuyển thành "Có" nhờ đổi host chính sang Google Cloud Run D-64. |
| **VIII. Khả năng làm việc nhóm, thuyết trình & phản biện** | 10 | — | 5.5 – 6.5 / 10 | 7.0 – 8.0 / 10 | 8.5 – 9.5 / 10 | Chuyển từ Một phần sang Có nhờ kế hoạch 5 vai rõ ràng, phân chia fixture và bộ 7 câu phản biện hạ tầng Cloud Run. Chỉ chấm khi có sản phẩm và thi thật. |
| **Tổng** | **100** | **83.25 / 85.5 điểm chấm được** | **60.5 – 68.0 / 100** | **75.5 – 84.0 / 100** | **87.0 – 93.5 / 100** | **Tăng từ mức đối chiếu cũ (~66.7 điểm ước tính theo quy ước Có=100%, Một phần=50%, Không có=0%) lên mức khả quan nhờ giải quyết các tiêu chí còn thiếu.** |

---

## 2. Chấm chi tiết từng ý

> **Lưu ý về cách tính điểm ý con:** Điểm các ý con là do nhóm tự chia đều, ước tính (barem gốc của BTC chỉ cho điểm theo tiêu chí/nhóm ý lớn, không chia nhỏ tới từng ý lẻ). Các ý thực hành trực tiếp (chạy demo, code sạch, giao diện thực tế, thuyết trình, phản biện) cột Thiết kế đánh dấu "—" vì chỉ chấm khi có sản phẩm thật.

### I. Tính sáng tạo & đổi mới (10 điểm)

| Ý | Điểm tối đa | Mức | Thiết kế | Dự kiến khi thi (ước tính) | Bằng chứng | Còn thiếu | Việc làm thêm (S/M/L) |
| :-- | :---: | :---: | :---: | :---: | :-- | :-- | :---: |
| **I.1. Ý tưởng mới lạ, giải pháp độc đáo không sao chép** | 4.5 | Có | 4.5 | 4.0 – 4.5 | [pitch/PHAN_BIEN_BGK.md#L10](../../pitch/PHAN_BIEN_BGK.md#L10), [pitch/PHAN_BIEN_BGK.md#L43](../../pitch/PHAN_BIEN_BGK.md#L43), [spec/01_KIEN_TRUC_VA_LUONG.md#L9](../../spec/01_KIEN_TRUC_VA_LUONG.md#L9) | Chưa có dữ liệu thực nghiệm người dùng thật đánh giá hiệu quả tiếp thu kiến thức so với cách học truyền thống. | S (tinh chỉnh slide nhấn mạnh tính độc đáo) |
| **I.2. Cách triển khai mang lại giá trị khác biệt** | 2.5 | Có | 2.5 | 2.0 – 2.5 | [pitch/PHAN_BIEN_BGK.md#L34](../../pitch/PHAN_BIEN_BGK.md#L34), [spec/01_KIEN_TRUC_VA_LUONG.md#L24](../../spec/01_KIEN_TRUC_VA_LUONG.md#L24) | Cần chứng minh độ mượt của đồ thị DAG và tốc độ bóc tách Tree-sitter không nghẽn trên repo thực tế. | S (chuẩn bị video quay màn hình so sánh) |
| **I.3. Phù hợp với xu hướng phát triển ngày nay** | 3.0 | Có | 2.5 | 2.0 – 2.5 | [pitch/PHAN_BIEN_BGK.md#L26](../../pitch/PHAN_BIEN_BGK.md#L26), [pitch/PHAN_BIEN_BGK.md#L43](../../pitch/PHAN_BIEN_BGK.md#L43) | Đổi mức từ Không có sang Có. Thiếu số liệu khảo sát định lượng về thực trạng vibe-coding trong sinh viên SGU (đang để lộ trình). | S (dẫn chứng bài báo/nhận định thực tế khi nói) |

### II. Tính thực tiễn & khả năng áp dụng (10 điểm)

| Ý | Điểm tối đa | Mức | Thiết kế | Dự kiến khi thi (ước tính) | Bằng chứng | Còn thiếu | Việc làm thêm (S/M/L) |
| :-- | :---: | :---: | :---: | :---: | :-- | :-- | :---: |
| **II.1. Giải quyết bài toán thực tế cấp thiết** | 3.5 | Có | 3.0 | 2.5 – 3.0 | [pitch/PHAN_BIEN_BGK.md#L26](../../pitch/PHAN_BIEN_BGK.md#L26), [pitch/ROADMAP.md#L26](../../pitch/ROADMAP.md#L26) | Chưa tiến hành khảo sát thực địa ≥ 50 sinh viên SGU và lấy ý kiến giảng viên phản biện (nằm ở Giai đoạn 1 lộ trình). | S (chuẩn bị dẫn chứng phỏng vấn nhanh 2-3 bạn) |
| **II.2. Đối tượng người dùng rõ ràng** | 3.0 | Có | 3.0 | 2.5 – 3.0 | [pitch/PHAN_BIEN_BGK.md#L10](../../pitch/PHAN_BIEN_BGK.md#L10), [pitch/PHAN_BIEN_BGK.md#L20](../../pitch/PHAN_BIEN_BGK.md#L20) | Định vị rõ sinh viên bảo vệ đồ án và lập trình viên mới tiếp cận repo lớn; chưa mở rộng sang đối tượng giảng viên chấm bài. | S (làm rõ persona sinh viên trên slide) |
| **II.3. Tính khả thi cao khi đưa vào vận hành** | 3.5 | Có | 3.0 | 2.5 – 3.0 | [spec/05_HA_TANG_CLOUD.md#L23](../../spec/05_HA_TANG_CLOUD.md#L23), [spec/01_KIEN_TRUC_VA_LUONG.md#L25](../../spec/01_KIEN_TRUC_VA_LUONG.md#L25), [spec/30_UI.md#L10](../../spec/30_UI.md#L10) | Đổi mức từ Một phần sang Có. Cần kiểm nghiệm độ ổn định tải thực tế trên hạ tầng Cloud Run phòng thi khi mạng yếu. | M (chạy thử tải đồng thời 5 người dùng) |

### III. Dữ liệu & mô hình (20 điểm)

#### III.1. Dữ liệu (5 điểm)

| Ý | Điểm tối đa | Mức | Thiết kế | Dự kiến khi thi (ước tính) | Bằng chứng | Còn thiếu | Việc làm thêm (S/M/L) |
| :-- | :---: | :---: | :---: | :---: | :-- | :-- | :---: |
| **III.1.a. Nguồn gốc, tính hợp pháp của dữ liệu** | 2.0 | Có | 2.0 | 1.5 – 2.0 | [spec/01_KIEN_TRUC_VA_LUONG.md#L25](../../spec/01_KIEN_TRUC_VA_LUONG.md#L25), [spec/00_QUYET_DINH.md#L69](../../spec/00_QUYET_DINH.md#L69), [spec/00_QUYET_DINH.md#L79](../../spec/00_QUYET_DINH.md#L79), [spec/10_ENGINE_INGEST.md#L271](../../spec/10_ENGINE_INGEST.md#L271) | Đổi mức từ Một phần sang Có. Chưa tự động quét giấy phép license của các repo ngoài do người dùng dán link. | S (bổ sung ghi chú khuyến cáo bản quyền ở UI) |
| **III.1.b. Chất lượng dữ liệu, số liệu đáng tin cậy** | 1.5 | Có | 1.5 | 1.0 – 1.25 | [spec/01_KIEN_TRUC_VA_LUONG.md#L32](../../spec/01_KIEN_TRUC_VA_LUONG.md#L32), [spec/02_CONTRACTS.md#L185](../../spec/02_CONTRACTS.md#L185), [pitch/PHAN_BIEN_BGK.md#L64](../../pitch/PHAN_BIEN_BGK.md#L64) | Số liệu độ trễ, chi phí USD và token tiêu thụ vẫn là ước tính lý thuyết, cần đo thật trên sản phẩm chạy ở giờ H+1. | S (ghi lại số đo thực tế ở H+1) |
| **III.1.c. Rõ ràng và minh bạch trong thu thập và xử lý** | 1.5 | Có | 1.5 | 1.25 – 1.5 | [spec/10_ENGINE_INGEST.md#L47](../../spec/10_ENGINE_INGEST.md#L47), [spec/04_KIEN_TRUC_TRIEN_KHAI.md#L364](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L364) | Đã quy định rõ luồng xử lý zero-disk trên RAM, che secret và PII trước khi gửi AI và lưu trữ CSDL. | S (sơ đồ minh bạch luồng dữ liệu trên slide) |

#### III.2. Mô hình (5 điểm)

| Ý | Điểm tối đa | Mức | Thiết kế | Dự kiến khi thi (ước tính) | Bằng chứng | Còn thiếu | Việc làm thêm (S/M/L) |
| :-- | :---: | :---: | :---: | :---: | :-- | :-- | :---: |
| **III.2.a. Lý do lựa chọn mô hình phù hợp** | 1.5 | Có | 1.5 | 1.25 – 1.5 | [spec/00_QUYET_DINH.md#L70](../../spec/00_QUYET_DINH.md#L70), [pitch/PHAN_BIEN_BGK.md#L276](../../pitch/PHAN_BIEN_BGK.md#L276), [pitch/PHAN_BIEN_BGK.md#L361](../../pitch/PHAN_BIEN_BGK.md#L361) | Cần bảng so sánh định lượng tốc độ/chi phí thực tế với các model khác cùng họ Gemini để bảo vệ thuyết phục. | S (hoàn thiện bảng so sánh model trên slide) |
| **III.2.b. Phương pháp thực nghiệm, tính tái lập kết quả** | 1.0 | Có | 1.0 | 0.75 – 1.0 | [spec/02_CONTRACTS.md#L115](../../spec/02_CONTRACTS.md#L115), [spec/01_KIEN_TRUC_VA_LUONG.md#L32](../../spec/01_KIEN_TRUC_VA_LUONG.md#L32), [spec/50_TEST_VA_FIXTURE.md#L8](../../spec/50_TEST_VA_FIXTURE.md#L8) | Đã khóa T=0, thinking budget=0, JSON schema và commit SHA cố định; cần chạy lặp lại 3 lần trên cùng repo demo để chứng minh. | S (ghi lại kết quả 3 lần chạy thử) |
| **III.2.c. Chất lượng đầu ra tin cậy, ổn định** | 1.5 | Có | 1.5 | 1.0 – 1.25 | [spec/20_AI_GOI_VA_PROMPT.md#L55](../../spec/20_AI_GOI_VA_PROMPT.md#L55), [spec/21_AI_KIEM_VA_DUYET.md#L9](../../spec/21_AI_KIEM_VA_DUYET.md#L9) | Phụ thuộc vào chất lượng duyệt tay output repo demo Q-03 ở mốc H+17 để ghi file bundle mẫu. | M (duyệt tay kỹ lưỡng output AI repo demo) |
| **III.2.d. Quản lý giới hạn, sai lệch, minh bạch quyết định** | 1.0 | Có | 1.0 | 0.75 – 1.0 | [spec/01_KIEN_TRUC_VA_LUONG.md#L30](../../spec/01_KIEN_TRUC_VA_LUONG.md#L30), [spec/00_QUYET_DINH.md#L45](../../spec/00_QUYET_DINH.md#L45), [pitch/PHAN_BIEN_BGK.md#L57](../../pitch/PHAN_BIEN_BGK.md#L57) | Minh bạch thừa nhận AI không kiểm được ngữ nghĩa 100%, có nhãn nhận định AI và cơ chế Báo sai hoàn điểm BKT. | S (tập dượt trả lời giới hạn trước BGK) |

#### III.3. Kiểm soát rủi ro, An toàn AI & Xử lý thiên lệch (5 điểm)

| Ý | Điểm tối đa | Mức | Thiết kế | Dự kiến khi thi (ước tính) | Bằng chứng | Còn thiếu | Việc làm thêm (S/M/L) |
| :-- | :---: | :---: | :---: | :---: | :-- | :-- | :---: |
| **III.3.a. Kiểm soát ảo giác (Hallucination)** | 1.0 | Có | 1.0 | 0.75 – 1.0 | [spec/21_AI_KIEM_VA_DUYET.md#L9](../../spec/21_AI_KIEM_VA_DUYET.md#L9), [spec/00_QUYET_DINH.md#L71](../../spec/00_QUYET_DINH.md#L71) | Cổng gác chặn tên bịa và công nghệ ngoài repo; có cơ chế gọi lại kèm lý do (D-51); cần ghi log thực tế số ca bị chặn. | S (thống kê số lần cổng gác bắt lỗi) |
| **III.3.b. Xử lý thiên lệch (Bias)** | 1.0 | Có | 0.75 | 0.5 – 0.75 | [spec/04_KIEN_TRUC_TRIEN_KHAI.md#L364](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L364), [spec/20_AI_GOI_VA_PROMPT.md#L44](../../spec/20_AI_GOI_VA_PROMPT.md#L44), [spec/21_AI_KIEM_VA_DUYET.md#L159](../../spec/21_AI_KIEM_VA_DUYET.md#L159) | Đổi mức từ Không có sang Có/Một phần. Không gửi PII cho AI; prompt chấm trung tính; chưa có tập benchmark đo thiên lệch chuyên sâu. | S (làm rõ giải pháp chống bias trong slide) |
| **III.3.c. Chống Prompt Injection** | 1.0 | Có | 1.0 | 0.75 – 1.0 | [spec/21_AI_KIEM_VA_DUYET.md#L9](../../spec/21_AI_KIEM_VA_DUYET.md#L9), [spec/00_QUYET_DINH.md#L39](../../spec/00_QUYET_DINH.md#L39), [spec/00_QUYET_DINH.md#L46](../../spec/00_QUYET_DINH.md#L46) | Regex chặn câu lệnh tấn công; AI chấm không nhận context code; luật Đạt kiểm tra trích dẫn thật bằng code. | S (thử nghiệm 3 ca injection điển hình) |
| **III.3.d. Lọc nội dung độc hại & Che dữ liệu nhạy cảm** | 1.0 | Có | 1.0 | 0.75 – 1.0 | [spec/00_QUYET_DINH.md#L85](../../spec/00_QUYET_DINH.md#L85), [spec/04_KIEN_TRUC_TRIEN_KHAI.md#L364](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L364), [spec/20_AI_GOI_VA_PROMPT.md#L58](../../spec/20_AI_GOI_VA_PROMPT.md#L58), [spec/21_AI_KIEM_VA_DUYET.md#L159](../../spec/21_AI_KIEM_VA_DUYET.md#L159) | Đổi mức từ Không có sang Có nhờ D-65 (`maskSensitive`, `BAD_WORDS`, chặn từ xấu 0 token, Gemini safetySettings BLOCK_ONLY_HIGH). | S (test tự động bộ lọc từ xấu và PII) |
| **III.3.e. Tính minh bạch & Khả năng giải thích** | 1.0 | Có | 1.0 | 0.75 – 1.0 | [spec/00_QUYET_DINH.md#L39](../../spec/00_QUYET_DINH.md#L39), [spec/30_UI.md#L10](../../spec/30_UI.md#L10) | Hiển thị rõ tiêu chí Đạt theo ý bắt buộc bám dòng code, nhãn nhận định AI, tiến trình BKT mài mòn minh bạch. | S (chuẩn bị ảnh chụp minh họa UI giải thích) |

#### III.4. Chất lượng đầu ra & Kiểm thử mô hình (5 điểm)

| Ý | Điểm tối đa | Mức | Thiết kế | Dự kiến khi thi (ước tính) | Bằng chứng | Còn thiếu | Việc làm thêm (S/M/L) |
| :-- | :---: | :---: | :---: | :---: | :-- | :-- | :---: |
| **III.4.a. Chỉ số đo lường cụ thể & Báo cáo đánh giá (Test Report)** | 2.5 | Một phần | 2.0 | 1.25 – 1.75 | [spec/21_AI_KIEM_VA_DUYET.md#L458](../../spec/21_AI_KIEM_VA_DUYET.md#L458), [pitch/PHAN_BIEN_BGK.md#L326](../../pitch/PHAN_BIEN_BGK.md#L326), [doc-de-hieu/07_ke_hoach_21h.md#L62](../../doc-de-hieu/07_ke_hoach_21h.md#L62) | Chưa có báo cáo đo lường F1, BLEU, ROUGE trên tập dữ liệu học thuật độc lập; test report hiện tại dựa vào duyệt tay output repo demo và bộ fixture. | M (chạy benchmark 20 ca mẫu ghi test report) |
| **III.4.b. Độ ổn định với trường hợp biên và dữ liệu mới** | 2.5 | Có | 2.5 | 1.75 – 2.25 | [spec/50_TEST_VA_FIXTURE.md#L8](../../spec/50_TEST_VA_FIXTURE.md#L8), [spec/00_QUYET_DINH.md#L71](../../spec/00_QUYET_DINH.md#L71), [spec/03_API_VA_LUU_TRU.md#L428](../../spec/03_API_VA_LUU_TRU.md#L428) | Đã thiết kế 13 ca kiểm thử tích hợp X-01..X-13 (repo rỗng, zip lỗi, không entry, ngắt AI); cần chạy pass toàn bộ trong giờ thi. | M (chạy pass toàn bộ bộ test X-01..X-13) |

### IV. Cấu trúc, chất lượng triển khai & độ hoàn thiện sản phẩm (20 điểm)

#### IV.1. Cấu trúc dự án (3 điểm)

| Ý | Điểm tối đa | Mức | Thiết kế | Dự kiến khi thi (ước tính) | Bằng chứng | Còn thiếu | Việc làm thêm (S/M/L) |
| :-- | :---: | :---: | :---: | :---: | :-- | :-- | :---: |
| **IV.1.a. Cấu trúc module rõ ràng, phân tách tốt** | 1.5 | Có | 1.5 | 1.25 – 1.5 | [spec/04_KIEN_TRUC_TRIEN_KHAI.md#L10](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L10), [doc-de-hieu/07_ke_hoach_21h.md#L27](../../doc-de-hieu/07_ke_hoach_21h.md#L27) | Phân tách rành mạch contracts dùng chung, engine RAM, AI guard, DB transactions; cần giữ đúng cấu trúc thư mục khi code. | S (tạo khung thư mục chuẩn ở H+0) |
| **IV.1.b. Code sạch, quy ước, dễ mở rộng** | 1.5 | Có | — | 1.0 – 1.5 | [spec/02_CONTRACTS.md#L5](../../spec/02_CONTRACTS.md#L5), [spec/01_KIEN_TRUC_VA_LUONG.md#L31](../../spec/01_KIEN_TRUC_VA_LUONG.md#L31) | Chỉ chấm khi có sản phẩm code thật (chưa viết code); thiết kế đã quy định TypeScript strict, không dùng any, tuân thủ INV-01..13. | S (bật ESLint và typecheck trên CI) |

#### IV.2. Kiến trúc FE, UI/UX (3 điểm)

| Ý | Điểm tối đa | Mức | Thiết kế | Dự kiến khi thi (ước tính) | Bằng chứng | Còn thiếu | Việc làm thêm (S/M/L) |
| :-- | :---: | :---: | :---: | :---: | :-- | :-- | :---: |
| **IV.2.a. Giao diện đẹp mắt, trực quan, mượt mà, responsive** | 1.5 | Có | — | 1.0 – 1.5 | [spec/30_UI.md#L9](../../spec/30_UI.md#L9), [spec/01_KIEN_TRUC_VA_LUONG.md#L33](../../spec/01_KIEN_TRUC_VA_LUONG.md#L33) | Chỉ chấm khi có sản phẩm giao diện chạy thật (chưa dựng frontend); thiết kế buồng lái 3 cột ReactFlow, Monaco Code Viewer, Cockpit. | S (test hiển thị trên màn hình laptop chiếu) |
| **IV.2.b. Tổ chức module FE, tối ưu tải** | 1.5 | Có | 1.5 | 1.25 – 1.5 | [spec/30_UI.md#L4](../../spec/30_UI.md#L4), [spec/00_QUYET_DINH.md#L85](../../spec/00_QUYET_DINH.md#L85) | Zustand store đồng bộ chỉ đọc từ server; Monaco tự host không CDN, tải chậm bằng next/dynamic để demo không cần mạng ngoài. | S (kiểm tra bundle không tải script ngoài) |

#### IV.3. Kiến trúc BE & Hiệu suất (5 điểm)

| Ý | Điểm tối đa | Mức | Thiết kế | Dự kiến khi thi (ước tính) | Bằng chứng | Còn thiếu | Việc làm thêm (S/M/L) |
| :-- | :---: | :---: | :---: | :---: | :-- | :-- | :---: |
| **IV.3.a. API RESTful chuẩn mực và cấu trúc DB hiệu quả** | 2.5 | Có | 2.5 | 2.0 – 2.5 | [spec/03_API_VA_LUU_TRU.md#L9](../../spec/03_API_VA_LUU_TRU.md#L9), [spec/00_QUYET_DINH.md#L85](../../spec/00_QUYET_DINH.md#L85) | 14 endpoints phân định rõ quyền, chuẩn hóa mã lỗi ERR_*; lược đồ Postgres chuẩn quan hệ, Supavisor transaction pooler D-65. | S (chạy migration chuẩn xác ở H+0) |
| **IV.3.b. Tốc độ phản hồi nhanh, tối ưu truy vấn & tài nguyên** | 2.5 | Có | 2.5 | 1.75 – 2.25 | [spec/00_QUYET_DINH.md#L79](../../spec/00_QUYET_DINH.md#L79), [spec/00_QUYET_DINH.md#L85](../../spec/00_QUYET_DINH.md#L85), [spec/01_KIEN_TRUC_VA_LUONG.md#L24](../../spec/01_KIEN_TRUC_VA_LUONG.md#L24) | Đổi mức từ Một phần sang Có. Đánh index DB, tối ưu nạp phiên tránh N+1, lưu lát cắt session_snapshots; chưa đo p95 tải lớn thật. | M (đo độ trễ endpoint /api/ingest và query) |

#### IV.4. CI/CD & Pipeline Deploy (3 điểm)

| Ý | Điểm tối đa | Mức | Thiết kế | Dự kiến khi thi (ước tính) | Bằng chứng | Còn thiếu | Việc làm thêm (S/M/L) |
| :-- | :---: | :---: | :---: | :---: | :-- | :-- | :---: |
| **IV.4.a. Tự động build, linting, chạy test (CI)** | 1.5 | Có | 1.5 | 1.25 – 1.5 | [spec/00_QUYET_DINH.md#L50](../../spec/00_QUYET_DINH.md#L50), [spec/04_KIEN_TRUC_TRIEN_KHAI.md#L320](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L320) | GitHub Actions ci.yml chạy typecheck, lint, vitest; security.yml chạy audit critical trên mọi PR. | S (dựng sẵn workflow ci.yml) |
| **IV.4.b. Tự động trigger deploy Staging & Production (CD)** | 1.5 | Có | 1.5 | 1.25 – 1.5 | [spec/00_QUYET_DINH.md#L50](../../spec/00_QUYET_DINH.md#L50), [spec/05_HA_TANG_CLOUD.md#L82](../../spec/05_HA_TANG_CLOUD.md#L82), [spec/50_TEST_VA_FIXTURE.md#L355](../../spec/50_TEST_VA_FIXTURE.md#L355) | Đổi mức từ Không có sang Có nhờ D-30. Tự động deploy Staging S2 trên Cloud Run, chạy smoke test tự động, Vai A duyệt production. | S (kiểm tra chạy thông pipeline deploy.yml) |

#### IV.5. Bảo mật & độ tin cậy (3 điểm)

| Ý | Điểm tối đa | Mức | Thiết kế | Dự kiến khi thi (ước tính) | Bằng chứng | Còn thiếu | Việc làm thêm (S/M/L) |
| :-- | :---: | :---: | :---: | :---: | :-- | :-- | :---: |
| **IV.5.a. Bảo vệ dữ liệu người dùng & chống lỗ hổng** | 1.5 | Có | 1.5 | 1.25 – 1.5 | [spec/00_QUYET_DINH.md#L85](../../spec/00_QUYET_DINH.md#L85), [spec/04_KIEN_TRUC_TRIEN_KHAI.md#L364](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L364) | Đổi mức từ Một phần sang Có nhờ D-65. Dependabot, Secret scanning, CodeQL, security headers, zero-disk không eval code, che PII/secret. | S (bật tính năng an ninh GitHub trước giờ thi) |
| **IV.5.b. Hệ thống vận hành ổn định và tin cậy** | 1.5 | Có | 1.5 | 1.25 – 1.5 | [spec/05_HA_TANG_CLOUD.md#L23](../../spec/05_HA_TANG_CLOUD.md#L23), [spec/05_HA_TANG_CLOUD.md#L73](../../spec/05_HA_TANG_CLOUD.md#L73), [spec/00_QUYET_DINH.md#L84](../../spec/00_QUYET_DINH.md#L84) | Cloud Run tự co giãn, min-instances = 1, healthcheck /api/health, uptime check; bản dự phòng nóng Vercel Phương án C; chế độ Offline. | S (kiểm tra tab Vercel dự phòng lúc demo) |

#### IV.6. Độ hoàn thiện sản phẩm (3 điểm)

| Ý | Điểm tối đa | Mức | Thiết kế | Dự kiến khi thi (ước tính) | Bằng chứng | Còn thiếu | Việc làm thêm (S/M/L) |
| :-- | :---: | :---: | :---: | :---: | :-- | :-- | :---: |
| **IV.6.a. Kiểm tra lỗi tự động & đóng gói bài bản** | 1.5 | Có | 1.5 | 1.0 – 1.25 | [spec/00_QUYET_DINH.md#L84](../../spec/00_QUYET_DINH.md#L84), [spec/05_HA_TANG_CLOUD.md#L58](../../spec/05_HA_TANG_CLOUD.md#L58), [spec/50_TEST_VA_FIXTURE.md#L8](../../spec/50_TEST_VA_FIXTURE.md#L8) | Đổi mức từ Không có sang Có nhờ D-64. Thiết kế Dockerfile multi-stage standalone non-root; có giờ cắt H+15 nếu trễ; 13 test xuyên module X-01..X-13. | M (hoàn thành Dockerfile trên nhánh riêng) |
| **IV.6.b. Chạy thực tế ổn định, không lỗi nghiêm trọng khi demo** | 1.5 | Có | — | 1.0 – 1.5 | [pitch/KICH_BAN_DEMO.md#L225](../../pitch/KICH_BAN_DEMO.md#L225), [spec/05_HA_TANG_CLOUD.md#L103](../../spec/05_HA_TANG_CLOUD.md#L103) | Chỉ chấm khi có sản phẩm demo trực tiếp (chưa demo); kịch bản demo chuẩn bị sẵn repo Q-03, tab Vercel dự phòng chuyển < 5s, chế độ Offline. | M (tập dượt demo chạy thử 3 lần trơn tru) |

### V. Đóng góp & tính cộng đồng (10 điểm)

| Ý | Điểm tối đa | Mức | Thiết kế | Dự kiến khi thi (ước tính) | Bằng chứng | Còn thiếu | Việc làm thêm (S/M/L) |
| :-- | :---: | :---: | :---: | :---: | :-- | :-- | :---: |
| **V.1. Tác động tích cực rõ ràng** | 2.5 | Có | 2.5 | 2.0 – 2.5 | [pitch/PHAN_BIEN_BGK.md#L10](../../pitch/PHAN_BIEN_BGK.md#L10), [pitch/ROADMAP.md#L10](../../pitch/ROADMAP.md#L10) | Giúp sinh viên CNTT hiểu rõ bản chất code, nắm vững luồng nghiệp vụ khi bảo vệ đồ án; chưa có số liệu tác động diện rộng. | S (làm rõ thông điệp giáo dục trên slide) |
| **V.2. Phương án triển khai, nhân rộng** | 2.5 | Có | 2.5 | 2.0 – 2.5 | [spec/00_QUYET_DINH.md#L53](../../spec/00_QUYET_DINH.md#L53), [spec/00_QUYET_DINH.md#L65](../../spec/00_QUYET_DINH.md#L65), [spec/00_QUYET_DINH.md#L69](../../spec/00_QUYET_DINH.md#L69) | Mã nguồn mở MIT, tài liệu tự cài đặt rõ ràng, kiến trúc Cloud Run serverless chi phí thấp dễ nhân rộng cho cộng đồng. | S (hoàn thiện mục Tự cài đặt trong README) |
| **V.3. Khả năng tiếp cận cộng đồng** | 2.5 | Có | 2.5 | 2.0 – 2.5 | [spec/30_UI.md#L9](../../spec/30_UI.md#L9), [spec/00_QUYET_DINH.md#L29](../../spec/00_QUYET_DINH.md#L29) | Dùng trực tiếp trên web không cần cài đặt; hỗ trợ cả link GitHub và upload zip; có chế độ Offline cho máy không có mạng. | S (kiểm tra giao diện thân thiện, dễ dùng) |
| **V.4. Lợi ích lâu dài cho cộng đồng** | 2.5 | Có | 2.5 | 2.0 – 2.5 | [pitch/ROADMAP.md#L10](../../pitch/ROADMAP.md#L10), [pitch/PHAN_BIEN_BGK.md#L40](../../pitch/PHAN_BIEN_BGK.md#L40) | Định hướng nghiên cứu chuyên sâu về độ tin cậy AI và BKT trong giáo dục kỹ nghệ phần mềm; phục vụ NCKH và Đồ án tốt nghiệp. | S (nhấn mạnh giá trị học thuật lâu dài) |

### VI. Sử dụng AI tiết kiệm chi phí và hiệu quả (10 điểm)

| Ý | Điểm tối đa | Mức | Thiết kế | Dự kiến khi thi (ước tính) | Bằng chứng | Còn thiếu | Việc làm thêm (S/M/L) |
| :-- | :---: | :---: | :---: | :---: | :-- | :-- | :---: |
| **VI.1. Ứng dụng AI tối ưu hóa ngân sách và tài nguyên** | 3.5 | Có | 3.5 | 3.0 – 3.5 | [spec/01_KIEN_TRUC_VA_LUONG.md#L24](../../spec/01_KIEN_TRUC_VA_LUONG.md#L24), [spec/00_QUYET_DINH.md#L57](../../spec/00_QUYET_DINH.md#L57), [pitch/PHAN_BIEN_BGK.md#L296](../../pitch/PHAN_BIEN_BGK.md#L296) | Bất biến INV-02: Tầng 0–2 Tree-sitter bóc tách AST 0 token; AI chỉ gọi ở 4 điểm suy luận; ai_cache chia sẻ tiết kiệm ~38,6% chi phí. | S (trình bày công thức Compound AI trên slide) |
| **VI.2. Cân bằng chi phí, chất lượng và tốc độ** | 3.5 | Có | 3.5 | 2.75 – 3.25 | [spec/00_QUYET_DINH.md#L70](../../spec/00_QUYET_DINH.md#L70), [spec/00_QUYET_DINH.md#L86](../../spec/00_QUYET_DINH.md#L86), [pitch/PHAN_BIEN_BGK.md#L296](../../pitch/PHAN_BIEN_BGK.md#L296), [spec/02_CONTRACTS.md#L185](../../spec/02_CONTRACTS.md#L185) | Đổi mức từ Một phần sang Có. Chọn gemini-3.5-flash-lite Vertex AI, khóa trần output, phản hồi 6,5–8s; 3 con số cốt lõi (~0,05 USD, 0,018 USD, (N-1)/N). | S (chuẩn bị bảng đối chiếu 3 con số cốt lõi) |
| **VI.3. Giải pháp đo lường và tối ưu chi phí** | 3.0 | Có | 3.0 | 2.5 – 3.0 | [spec/00_QUYET_DINH.md#L86](../../spec/00_QUYET_DINH.md#L86), [spec/03_API_VA_LUU_TRU.md#L212](../../spec/03_API_VA_LUU_TRU.md#L212), [spec/04_KIEN_TRUC_TRIEN_KHAI.md#L280](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L280), [spec/05_HA_TANG_CLOUD.md#L111](../../spec/05_HA_TANG_CLOUD.md#L111), [spec/30_UI.md#L75](../../spec/30_UI.md#L75) | Đổi mức từ Một phần sang Có nhờ D-66. Đo chi phí L1 (Pino log), L2 (bảng ai_usage), tooltip USD trên UI, Google Cloud Budget Alert $20 và AI_DISABLED. | S (kiểm tra ghi nhận bảng ai_usage khi chạy) |

### VII. Ứng dụng công nghệ AWS hoặc Google (10 điểm)

| Ý | Điểm tối đa | Mức | Thiết kế | Dự kiến khi thi (ước tính) | Bằng chứng | Còn thiếu | Việc làm thêm (S/M/L) |
| :-- | :---: | :---: | :---: | :---: | :-- | :-- | :---: |
| **VII.1. Triển khai ứng dụng/dịch vụ lên AWS hoặc Google Cloud** | 3.5 | Có | 3.5 | 2.75 – 3.25 | [spec/00_QUYET_DINH.md#L84](../../spec/00_QUYET_DINH.md#L84), [spec/05_HA_TANG_CLOUD.md#L10](../../spec/05_HA_TANG_CLOUD.md#L10) | Đổi mức từ Không có sang Có nhờ D-64. Ứng dụng Next.js triển khai trên Google Cloud Run (asia-southeast1), gọi Vertex AI. Phải deploy thành công trong giờ thi. | S (thử lệnh deploy gcloud trước ngày thi) |
| **VII.2. Cấu hình chuẩn production, domain/IP công khai, ổn định** | 3.5 | Có | 3.5 | 2.75 – 3.25 | [spec/05_HA_TANG_CLOUD.md#L23](../../spec/05_HA_TANG_CLOUD.md#L23), [spec/05_HA_TANG_CLOUD.md#L41](../../spec/05_HA_TANG_CLOUD.md#L41), [spec/03_API_VA_LUU_TRU.md#L44](../../spec/03_API_VA_LUU_TRU.md#L44) | Đổi mức từ Không có sang Có nhờ D-64. URL mặc định *.run.app HTTPS, min-instances = 1, timeout 300s, probe /api/health, Uptime Check, rollback revision. | S (bật Uptime Check trên Cloud Monitoring) |
| **VII.3. Quản lý tài nguyên, mạng, bảo mật đám mây an toàn** | 3.0 | Có | 3.0 | 2.5 – 3.0 | [spec/05_HA_TANG_CLOUD.md#L49](../../spec/05_HA_TANG_CLOUD.md#L49), [spec/05_HA_TANG_CLOUD.md#L111](../../spec/05_HA_TANG_CLOUD.md#L111), [spec/04_KIEN_TRUC_TRIEN_KHAI.md#L360](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L360) | Đổi mức từ Không có sang Có nhờ D-64. Ingress public dưới Edge DDoS Google, IAM Service Account tối thiểu, Secret Manager lưu biến mật, Budget Alert. | S (kiểm tra Secret Manager và IAM roles) |

### VIII. Khả năng làm việc nhóm, thuyết trình, trình diễn sản phẩm & phản biện (10 điểm)

| Ý | Điểm tối đa | Mức | Thiết kế | Dự kiến khi thi (ước tính) | Bằng chứng | Còn thiếu | Việc làm thêm (S/M/L) |
| :-- | :---: | :---: | :---: | :---: | :-- | :-- | :---: |
| **VIII.1. Làm việc nhóm hiệu quả và phân chia công việc hợp lý** | 2.5 | Có | — | 1.5 – 2.5 | [doc-de-hieu/07_ke_hoach_21h.md#L24](../../doc-de-hieu/07_ke_hoach_21h.md#L24), [doc-de-hieu/07_ke_hoach_21h.md#L41](../../doc-de-hieu/07_ke_hoach_21h.md#L41), [doc-de-hieu/07_ke_hoach_21h.md#L84](../../doc-de-hieu/07_ke_hoach_21h.md#L84) | Chỉ chấm khi có sản phẩm và thi thật (chưa thi); phân công 5 vai A, B, C, D, E rõ ràng với các điểm nối fixture; cần bảo đảm cả 5 thành viên đều có commit Git trong giờ thi. | S (theo dõi phân bổ commit đều giữa 5 vai) |
| **VIII.2. Trình bày rõ ràng bài toán, giải pháp bằng tình huống thực tế** | 2.5 | Có | — | 1.5 – 2.5 | [pitch/KICH_BAN_DEMO.md#L10](../../pitch/KICH_BAN_DEMO.md#L10), [doc-de-hieu/07_ke_hoach_21h.md#L63](../../doc-de-hieu/07_ke_hoach_21h.md#L63) | Chỉ chấm khi có sản phẩm và thuyết trình thật; kịch bản demo chuẩn bị chi tiết từng câu thoại, thao tác theo 3 kịch bản A, B, C; có video demo quay trước tại H+19. | M (tập dượt thuyết trình khớp thời lượng 5 phút) |
| **VIII.3. Giải thích được cách AI, dữ liệu, mô hình và kỹ thuật** | 2.5 | Có | — | 1.5 – 2.5 | [pitch/PHAN_BIEN_BGK.md#L273](../../pitch/PHAN_BIEN_BGK.md#L273), [pitch/PHAN_BIEN_BGK.md#L353](../../pitch/PHAN_BIEN_BGK.md#L353) | Chỉ chấm khi có sản phẩm và phản biện thật; bảng giải trình công nghệ tại sao chọn Tree-sitter, BKT, Gemini 3.5 Flash-Lite, Google Cloud Run và Supabase rất chi tiết. | S (thống nhất người nói các câu kỹ thuật sâu) |
| **VIII.4. Phản biện thuyết phục về hiệu quả, giới hạn, chi phí** | 2.5 | Có | — | 1.5 – 2.5 | [pitch/PHAN_BIEN_BGK.md#L53](../../pitch/PHAN_BIEN_BGK.md#L53), [pitch/PHAN_BIEN_BGK.md#L273](../../pitch/PHAN_BIEN_BGK.md#L273), [pitch/PHAN_BIEN_BGK.md#L296](../../pitch/PHAN_BIEN_BGK.md#L296), [pitch/PHAN_BIEN_BGK.md#L306](../../pitch/PHAN_BIEN_BGK.md#L306) | Chỉ chấm khi có sản phẩm và phản biện thật; bộ 7 câu hỏi phản biện hạ tầng Cloud Run (Mục F), 3 con số chi phí cốt lõi; cần giữ vững thái độ trung thực khi bị hỏi xoáy. | S (tập dượt phản biện xoáy vào số liệu) |

---

## 3. Điểm mạnh nên nhấn khi trình bày

1. **Kiến trúc "Code thuần trước, AI sau" (INV-02) tạo nên Compound AI System thực thụ:**
   - Thay vì ném cả repo cho LLM đọc gây tốn kém hàng triệu token và sinh ảo giác nặng nề, SimpliFey dùng Tree-sitter WASM bóc tách cú pháp tĩnh và đồ thị gọi hàm trong RAM với chi phí **0 token**.
   - AI chỉ can thiệp ở đúng 4 điểm cần suy luận ngữ nghĩa cao cấp. Điều này giúp hệ thống đạt độ trễ phản hồi nhanh và chi phí chỉ ~0,018 USD để phân tích một repo 7 bài học (ước tính).

2. **Định vị sắc bén giải quyết triệt để vấn nạn "Vibe-coding":**
   - Không dừng lại ở việc hỗ trợ người dùng *đọc* hay *viết* code hộ (như Copilot, Cursor, DeepWiki), SimpliFey kiểm tra xem người học có thực sự *hiểu* bản chất dòng code do chính mình viết ra hay không.
   - Ứng dụng phương pháp Feynman hỏi ngược lại sinh viên bám sát từng dòng code thực tế, kết hợp mô hình BKT theo dõi lỗ hổng kiến thức lâu dài trên 16 kỹ năng kiến trúc phần mềm.

3. **Hạ tầng đám mây Google Cloud Run chuẩn mực doanh nghiệp (D-64):**
   - Toàn bộ backend và SSR Next.js đóng gói container triển khai trên Google Cloud Run tại vùng `asia-southeast1` (Singapore) với khả năng co giãn tự động, HTTPS mặc định, probe sức khỏe `/api/health` và chống DDoS tại Edge.
   - Bí mật lưu trữ tách biệt trong **Secret Manager**, xác thực danh tính qua Service Account tối thiểu gọi Vertex AI không cần lưu chuỗi API key tĩnh trên server.

4. **Đường ống CI/CD GitHub Actions hiện đại kèm môi trường Staging S2 độc lập (D-30):**
   - Tự động hóa kiểm thử tĩnh (`ci.yml`), quét lỗ hổng phụ thuộc (`security.yml`), đóng gói và tự động deploy lên môi trường Staging S2 độc lập (`simplifey-staging`) kết nối database dev/staging tách biệt.
   - Tự động chạy **smoke test** sau deploy (probe healthcheck và ingest thử nghiệm repo demo với token bot). Chỉ cho phép chuyển lên Production (`simplifey-prod`) sau khi Trưởng tích hợp (Vai A) bấm duyệt tại GitHub Environment `production`.

5. **Lượng hóa và tối ưu chi phí AI khoa học (D-66):**
   - Hệ thống đo lường chi phí hai tầng: L1 (log có cấu trúc Pino đẩy Cloud Logging) và L2 (bảng Postgres `ai_usage` lưu vết chi phí chi tiết từng lời gọi).
   - Bộ nhớ đệm `ai_cache` chia sẻ kết quả phân tích giữa các người học cùng repo giúp tiết kiệm ~38,6% chi phí token.
   - Bộ 3 con số cốt lõi bảo vệ trước BGK: ~0,05 USD cho người học đầu tiên, ~0,018 USD phân tích repo, và tỷ lệ trúng cache = $(N - 1) / N$.
   - Chính sách Google Cloud Budget Alert $20.00 / tháng với công tắc bán tự động `AI_DISABLED="true"` ngắt khẩn cấp khi chạm ngưỡng an toàn.

6. **Rào chắn an toàn AI nhiều lớp không tốn token (D-65):**
   - Regex chặn câu lệnh tấn công Prompt Injection ngay tại client và server.
   - Hàm `maskSensitive` che toàn bộ secret, email, số điện thoại VN, số CCCD bằng `***` và chặn từ ngữ độc hại 0 token trả `ERR_ANSWER_INAPPROPRIATE`.
   - Cổng gác bằng code kiểm soát chặt chẽ đầu ra của AI, loại bỏ tên hàm/biến bịa đặt trước khi gửi tới người dùng.

---

## 4. Điểm yếu và rủi ro mất điểm

| Rủi ro | Ý barem | Điểm có thể mất (ước tính) | Cách giảm | Ai / khi nào |
| :-- | :---: | :---: | :-- | :-- |
| **R1. Ban Giám khảo yêu cầu nạp thử repo lạ tại chỗ (ngoài tầm kiểm chứng)** | II.3, III.4, IV.6 | 2.0 – 3.0 điểm | Nêu rõ giới hạn kỹ thuật: hệ thống đã kiểm chứng tốt nhất trên TypeScript/JavaScript và Python (INV-09); nếu repo quá lớn thì dùng tính năng tải chọn lọc một thư mục (D-63); xin phép BGK demo luồng chuẩn bị sẵn trước, sau đó mới thử nghiệm repo ngoài và phân tích nguyên lý. | Cả nhóm / trong lúc demo |
| **R2. Chậm tiến độ code trong 21 giờ không kịp hoàn thiện đầy đủ tính năng** | IV.6, VIII.1 | 2.0 – 4.0 điểm | Tuân thủ nghiêm ngặt bảng thứ tự cắt giảm dự phòng trong `doc-de-hieu/07_ke_hoach_21h.md` Mục 3 (cắt trước Java/Go/Dart, ẩn nút Báo sai, cắt màn hình lịch sử; bảo vệ bằng được lát cắt dọc lõi: Ingest -> DAG -> Tab 1 -> Câu hỏi -> Chấm -> BKT). | Cả nhóm / trong suốt 21 giờ |
| **R3. Thiếu số liệu thực nghiệm benchmark (Accuracy, F1, Latency p95) quy mô lớn** | III.4, VI | 1.5 – 2.5 điểm | Thừa nhận trung thực số liệu hiện tại là ước tính và mục tiêu; nhấn mạnh quy trình kiểm chứng thực tế qua việc duyệt tay 100% output AI của repo demo ở H+17 và bộ 13 ca kiểm thử tích hợp xuyên module X-01..X-13 trong spec/50. | Vai C, Vai E / khi phản biện |
| **R4. Sự cố mạng phòng thi hoặc nghẽn kết nối đến dịch vụ ngoài (GitHub, Supabase, Vertex)** | IV.5, IV.6, VII.2 | 2.0 – 3.0 điểm | Chuẩn bị 4 tầng phòng thủ dự phòng: (1) Rollback revision trên Cloud Run; (2) Chuyển chuột sang tab Vercel dự phòng nóng (< 5 giây); (3) Bật Chế độ Offline (`Ctrl+Shift+D`) chạy trên RAM trình duyệt không cần mạng; (4) Chiếu video demo dự phòng quay lúc H+19. | Vai A, Vai D, Vai E / khi demo |
| **R5. Hết hạn mức credit hoặc vượt ngưỡng ngân sách Google Cloud trong lúc thi** | VI, VII | 1.0 – 2.0 điểm | Thiết lập Google Cloud Budget Alert $20/tháng; nếu chạm mốc cảnh báo 100% thì Vai A kích hoạt công tắc bán tự động đặt biến môi trường `AI_DISABLED="true"` trên Cloud Run; chuyển sang bản Vercel dự phòng dùng backend Studio. | Vai A / trong giờ thi |
| **R6. Project Supabase gói Free bị tạm dừng (pause) do không hoạt động** | IV.3, VII.2 | 2.0 – 3.0 điểm | Đánh thức cả 2 project Supabase (dev/staging và production) trước ngày thi (06/11); gửi query ping kiểm tra trạng thái sẵn sàng của cơ sở dữ liệu. | Vai A / trước ngày thi |
| **R7. Lỗi cấu hình Workload Identity Federation (WIF) làm nghẽn pipeline deploy CI/CD** | IV.4, VII.1 | 1.0 – 2.0 điểm | Kiểm tra thử nghiệm WIF trước ngày thi; chuẩn bị sẵn phương án dự phòng Service Account Key JSON lưu trong GitHub Secret `GCP_SA_KEY` để chuyển đổi tức thì. | Vai A / trước ngày thi & H+0 |

---

## 5. Top 10 việc tăng điểm nhiều nhất

Bảng sắp xếp thứ tự ưu tiên các công việc giúp tăng điểm nhiều nhất chia theo tỷ lệ (Điểm tăng ước tính ÷ Công sức thực hiện):

| # | Việc | Ý barem | Điểm tăng (ước tính) | Công sức | Làm trước giờ thi hay trong giờ thi | Ai (vai A–E) |
| :-: | :-- | :---: | :---: | :---: | :-- | :-- |
| 1 | Thử nghiệm triển khai ứng dụng Next.js lên Google Cloud Run bằng lệnh `gcloud run deploy --source` | VII.1, VII.2 | +3.5 | S (≤ 1h) | Trước giờ thi: thử trên **repo nháp riêng**; trong giờ thi: deploy thật từ repo thi | Vai A |
| 2 | Cấu hình workflow GitHub Actions `ci.yml`, `security.yml` và `deploy.yml` tự động deploy Staging S2 | IV.4 | +2.5 | S (≤ 1h) | **Trong giờ thi** (H+0–1). Trước giờ thi chỉ chuẩn bị phần cấu hình ngoài repo: WIF, IAM, GitHub Environment, Secrets | Vai A |
| 3 | Chốt chính xác repo demo thật đạt chuẩn theo câu hỏi mở Q-03 (Express/NestJS, 20–50 file, có điểm dở kiến trúc) | III.4, IV.6, VIII.2 | +2.5 | S (≤ 1h) | Làm trước giờ thi | Cả nhóm |
| 4 | Đánh thức 2 project Supabase (D2), kiểm tra kết nối Supavisor và tạo tài khoản bot test cho smoke test | IV.3, IV.4 | +1.5 | S (≤ 0.5h) | Làm trước giờ thi | Vai A |
| 5 | Thiết lập Workload Identity Federation (WIF) và phân quyền IAM `roles/run.sourceDeveloper` trên GCP | IV.4, VII.3 | +1.5 | S (≤ 1h) | Làm trước giờ thi | Vai A |
| 6 | Xây dựng bộ test fixture và thực hiện quy trình duyệt tay output AI repo demo ở H+17 (`mock_bundle.json`) | III.4, IV.6 | +2.0 | M (1–3h) | Trong giờ thi (H+1–4, H+17) | Vai E |
| 7 | Cài đặt bộ lọc an toàn `maskSensitive`, che PII/secret và chặn từ xấu 0 token trả lỗi `ERR_ANSWER_INAPPROPRIATE` (D-65) | III.3, IV.5 | +2.0 | M (1–3h) | Trong giờ thi (H+4–8) | Vai C |
| 8 | Tạo bảng Postgres `ai_usage` đo chi phí L2, ghi log cấu trúc L1 và hiển thị tooltip USD trên Header UI (D-66) | VI, IV.3 | +1.5 | M (1–3h) | Trong giờ thi (H+1–4, H+8–12) | Vai A, Vai D |
| 9 | Viết Dockerfile multi-stage standalone trên nhánh riêng trước mốc giờ cắt H+15 (03:00 sáng) (D-64) | IV.6 | +1.5 | M (1–3h) | Trong giờ thi (H+8–12) | Vai A |
| 10 | Tập dượt kịch bản demo (kịch bản A, B, C) khớp thời lượng 5 phút và quay video demo dự phòng lúc H+19 | IV.6, VIII.2 | +2.0 | M (1–3h) | Trong giờ thi (H+17–19) | Vai E, Cả nhóm |

---

## 6. Việc phải làm trước ngày thi

Danh sách kiểm tra bắt buộc phải hoàn thành trước ngày thi chính thức (07/11/2026):

- [ ] **Hỏi mentor anh Cảnh về credit Vertex:** Tham vấn anh Cảnh (theo câu hỏi số 4 trong `CAU_HOI_ANH_CANH.md`) để làm rõ việc khoản credit Google Cloud cuộc thi tài trợ có sử dụng được để chi trả cho các lời gọi mô hình Gemini qua dịch vụ Vertex AI hay không; chuẩn bị nguồn thanh toán thẻ Visa/Mastercard dự phòng cho đội.
- [ ] **Đánh thức Supabase (cả 2 project):** Đăng nhập dashboard Supabase để đánh thức 2 project Supabase (project dev/staging và project production), phòng ngừa trường hợp gói Free bị Supabase tự động tạm dừng sau 1 tuần không hoạt động; chạy thử query SQL ping kiểm tra kết nối qua cổng pooler 6543.
- [ ] **Chốt repo demo Q-03:** Thống nhất trong nhóm và chốt một repo demo thật theo đúng tiêu chuẩn của câu hỏi mở Q-03: repo công khai trên GitHub, viết bằng TypeScript/JavaScript (Express hoặc NestJS), quy mô 20–50 file code, chứa ít nhất một điểm dở kiến trúc rõ nét (như truy vấn DB trong vòng lặp hoặc thiếu transaction) và kích thước nén ≤ 15 MB.
- [ ] **Thử WIF và cấu hình xác thực:** Tạo Workload Identity Federation (WIF) kết nối GitHub Actions với Google Cloud; chạy thử nghiệm lệnh xác thực OIDC; chuẩn bị sẵn một Service Account Key dạng JSON lưu vào GitHub Secret `GCP_SA_KEY` để phòng ngừa trục trặc trong phòng thi.
- [ ] **Phân quyền sourceDeveloper trên GCP:** Cấp quyền IAM `roles/run.sourceDeveloper` và `roles/serviceusage.serviceUsageConsumer` trên project GCP cho tài khoản deployer GitHub Actions để bảo đảm lệnh deploy `--source` thực thi trơn tru mà không bị chặn quyền.
- [ ] **Đo thử chi phí và độ trễ Vertex AI:** Gọi thử nghiệm mô hình `gemini-3.5-flash-lite` trên Vertex AI endpoint `location: "global"` với bộ prompt thực tế của hệ thống để đo độ trễ phản hồi (ms) và lượng token vào/ra; tinh chỉnh lại hằng số `CONFIG.LLM_TIMEOUT_MS` nếu cần thiết.
- [ ] **Cấu hình Google Cloud Budget Alert:** Thiết lập chính sách cảnh báo ngân sách Cloud Billing ở mức trần $20.00 / tháng với 3 mốc cảnh báo tự động 50 % ($10.00), 80 % ($16.00), 100 % ($20.00) gửi thông báo về email của đội thi.
- [ ] **Tạo tài khoản bot cho smoke test:** Tạo một tài khoản bot kiểm thử trên project Supabase dev/staging (bật Email provider trên project này), lưu thông tin đăng nhập vào GitHub Secrets để phục vụ bước smoke test tự động sau deploy.
- [ ] **Cấu hình Redirect URLs Supabase Auth:** Khai báo đầy đủ cả 2 tên miền dịch vụ trên Supabase Auth URL Configuration: domain Cloud Run chính `https://<service-id>.run.app/auth/callback` và domain Vercel dự phòng `https://<app>.vercel.app/auth/callback` (kèm `http://localhost:3000/**`).

---

## 7. Cần người quyết

1. **Chốt repo demo chính thức (Q-03):** Cả nhóm cần thống nhất chọn repo nào trong số các ứng viên (Shop API, Bookstore API, Task Management API) để chuẩn bị trước file fixture và kịch bản demo duyệt tay.
2. **Người nắm tài khoản thanh toán GCP và thẻ ngân hàng:** Vai A hoặc thành viên chỉ định cần chuẩn bị sẵn thẻ thanh toán quốc tế đã kích hoạt thanh toán online để liên kết tài khoản Google Cloud Billing và nạp credit.
3. **Người kích hoạt công tắc bán tự động ngắt AI:** Thống nhất chỉ duy nhất Vai A có thẩm quyền thực hiện lệnh `gcloud run services update` để đặt `AI_DISABLED="true"` khi nhận cảnh báo ngân sách 100%, tránh xung đột thao tác lúc thi.
4. **Phân vai trình bày trước Hội đồng Giám khảo:** Xác định rõ người thuyết trình chính (thường là Vai A hoặc Vai E), người thao tác chuột buồng lái demo (Vai D), và người chịu trách nhiệm trả lời các câu hỏi kỹ thuật chuyên sâu (Vai B, Vai C).

---

## 8. Điều chưa chắc

1. **Khả năng chi trả Vertex AI bằng credit cuộc thi:** Chưa kiểm chứng được tài khoản credit dùng thử của Google Cloud do BTC hoặc đối tác tài trợ có hỗ trợ thanh toán chi phí API Vertex AI `global` hay không (đã đưa vào câu hỏi tham vấn anh Cảnh).
2. **Tốc độ mạng và giới hạn rate-limit tại hội trường thi:** Chưa rõ mạng internet tại trường Đại học Sài Gòn có bị tường lửa chặn các kết nối tới `codeload.github.com` hay giới hạn băng thông download file zip không; nhóm cần chuẩn bị sẵn sim 4G/5G phát sóng độc lập.
3. **Thời gian cold-start của Staging S2 trên Cloud Run:** Do service `simplifey-staging` đặt cấu hình `min-instances = 0` để tiết kiệm chi phí, request đầu tiên của smoke test có thể mất từ 5–10 giây; cần kiểm chứng xem có vượt ngưỡng timeout 10s của GitHub Actions hay không.
4. **Độ ổn định của Supavisor Transaction Pooler với số lượng kết nối đồng thời:** Khi Cloud Run co giãn lên 4 bản sao (`max-instances = 4`), mỗi bản sao mở tối đa 5 kết nối client tới Supavisor (tổng 20 kết nối). Cần kiểm chứng xem cấu hình `prepare: false` của driver `postgres` 3.x có hoạt động trơn tru trong suốt 21 giờ hay không.

---
