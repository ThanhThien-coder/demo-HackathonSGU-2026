# ĐỐI CHIẾU TIÊU CHÍ CHẤM ĐIỂM VÒNG 24H & CHUNG KẾT VỚI TÀI LIỆU SIMPLIFEY

> **Ghi chú phân tích:**
> - Đối chiếu lại từng ý với đúng dòng trong tài liệu, không dựa vào trí nhớ.
> - Trong lúc đọc, `spec/` đã thay đổi: số dòng lệch và đã có người dùng D-63. Lấy lại số dòng mới nhất để không chỉ sai chỗ.
> - Trước khi ghi "không có" ở một ý nào, tìm trên toàn bộ tài liệu để chắc là không sót.
> - Đối chiếu **54 ý** trong tiêu chí đánh giá: **27 ý có**, **19 ý có một phần**, **8 ý không có**.
> - *"Có"* chỉ mang nghĩa là tài liệu có câu trả lời/đặc tả, vì code chưa được viết.
> - **Quy ước viết tắt:** `PB` là [`pitch/PHAN_BIEN_BGK.md`](../../pitch/PHAN_BIEN_BGK.md).

---

## I. Sáng tạo và đổi mới (10đ)

| Ý | Kết luận | Chỗ trả lời |
| :-- | :-- | :-- |
| Ý tưởng mới, giải pháp độc đáo | **Có** | [PB:43–47](../../pitch/PHAN_BIEN_BGK.md#L43-L47) |
| Không sao chép, có giá trị khác biệt | **Có** | [PB:34–41](../../pitch/PHAN_BIEN_BGK.md#L34-L41), [PB:49](../../pitch/PHAN_BIEN_BGK.md#L49); chưa so với Understand-Anything |
| Hợp xu hướng hiện nay | *Không có* | Không có dẫn chứng xu hướng nào |

---

## II. Thực tiễn và khả năng áp dụng (10đ)

| Ý | Kết luận | Chỗ trả lời |
| :-- | :-- | :-- |
| Bài toán thực tế, cấp thiết | **Một phần** | [PB:26–27](../../pitch/PHAN_BIEN_BGK.md#L26-L27) có mô tả; [PB:28](../../pitch/PHAN_BIEN_BGK.md#L28) ghi "chưa có" bằng chứng |
| Đối tượng người dùng rõ | **Một phần** | [PB:10](../../pitch/PHAN_BIEN_BGK.md#L10) chỉ ghi sinh viên; từ "vibecoder" không xuất hiện trong `spec/`, `pitch/` |
| Khả thi khi vận hành | **Một phần** | [01_deploy.md](../../doc-de-hieu/01_deploy.md), [spec/04:367](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L367); chưa chạy thật |

---

## III. Dữ liệu và mô hình (20đ)

### III.1 Dữ liệu (5đ)

| Ý | Kết luận | Chỗ trả lời |
| :-- | :-- | :-- |
| Nguồn gốc, tính hợp pháp | **Một phần** | [spec/50:24](../../spec/50_TEST_VA_FIXTURE.md#L24), [D-50](../../spec/00_QUYET_DINH.md#L70); chưa xét giấy phép repo người dùng, [Nghị định 13](../../pitch/ROADMAP.md#L83) để sau |
| Chất lượng, số liệu tin cậy | **Một phần** | [spec/02:178](../../spec/02_CONTRACTS.md#L178) ghi đa số chưa đo |
| Minh bạch thu thập, xử lý | **Có** | [spec/01:216](../../spec/01_KIEN_TRUC_VA_LUONG.md#L216), [spec/04:356](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L356), [PB:218–225](../../pitch/PHAN_BIEN_BGK.md#L218-L225) |

### III.2 Mô hình (5đ)

| Ý | Kết luận | Chỗ trả lời |
| :-- | :-- | :-- |
| Lý do chọn mô hình | **Có** | [D-50](../../spec/00_QUYET_DINH.md#L70), [PB:332](../../pitch/PHAN_BIEN_BGK.md#L332); BKT đặt tay, chưa fit ([PB:202](../../pitch/PHAN_BIEN_BGK.md#L202)) |
| Thực nghiệm đúng, tái lập được | **Một phần** | [spec/21:434](../../spec/21_AI_KIEM_VA_DUYET.md#L434), [:452](../../spec/21_AI_KIEM_VA_DUYET.md#L452), [INV-10](../../spec/01_KIEN_TRUC_VA_LUONG.md#L32); repo đo riêng chỉ là ["nếu có"](../../spec/21_AI_KIEM_VA_DUYET.md#L479) |
| Đầu ra tin cậy, ổn định | **Một phần** | [spec/21:472–479](../../spec/21_AI_KIEM_VA_DUYET.md#L472-L479) mới là mẫu, chưa có số |
| Quản lý giới hạn, sai lệch, thiên lệch, minh bạch | **Một phần** | [spec/21:486](../../spec/21_AI_KIEM_VA_DUYET.md#L486), [PB:53](../../pitch/PHAN_BIEN_BGK.md#L53); không có phần thiên lệch dữ liệu |

### III.3 Rủi ro và an toàn AI (5đ)

| Ý | Kết luận | Chỗ trả lời |
| :-- | :-- | :-- |
| Hạn chế ảo giác | **Có** | [spec/21:46](../../spec/21_AI_KIEM_VA_DUYET.md#L46) |
| Xử lý thiên lệch | *Không có* | Chỉ thừa nhận "chấm lệch" ở [spec/21:486](../../spec/21_AI_KIEM_VA_DUYET.md#L486); việc [không gửi tên, email](../../spec/20_AI_GOI_VA_PROMPT.md#L34) chỉ giúp gián tiếp |
| Chống prompt injection | **Có** | [spec/21:329](../../spec/21_AI_KIEM_VA_DUYET.md#L329), [spec/20:353](../../spec/20_AI_GOI_VA_PROMPT.md#L353), [spec/10:262](../../spec/10_ENGINE_INGEST.md#L262) |
| Lọc nội dung độc hại | *Không có* | Từ khóa liên quan không xuất hiện trong spec |
| Che dữ liệu nhạy cảm | **Có** | [spec/10:271](../../spec/10_ENGINE_INGEST.md#L271), [spec/20:34](../../spec/20_AI_GOI_VA_PROMPT.md#L34) |
| Minh bạch, giải thích quyết định AI | **Có** | [spec/30:40](../../spec/30_UI.md#L40), [:156](../../spec/30_UI.md#L156), [D-13](../../spec/00_QUYET_DINH.md#L39) |

### III.4 Chất lượng và kiểm thử (5đ)

| Ý | Kết luận | Chỗ trả lời |
| :-- | :-- | :-- |
| Chỉ số đo cụ thể | **Một phần** | [spec/21:472](../../spec/21_AI_KIEM_VA_DUYET.md#L472) có X/N, X/20; chưa có F1 hay Latency theo p95 |
| Báo cáo đánh giá minh bạch | **Một phần** | [spec/21:458](../../spec/21_AI_KIEM_VA_DUYET.md#L458) chỉ là bảng duyệt |
| Ổn định với trường hợp biên | **Có** | [spec/50:282](../../spec/50_TEST_VA_FIXTURE.md#L282), [spec/03:428](../../spec/03_API_VA_LUU_TRU.md#L428), [spec/21:454](../../spec/21_AI_KIEM_VA_DUYET.md#L454) |
| Ổn định với dữ liệu mới | **Một phần** | [spec/21:480](../../spec/21_AI_KIEM_VA_DUYET.md#L480) chỉ dặn cách nói khi output chưa duyệt |

---

## IV. Cấu trúc và độ hoàn thiện (20đ)

| Mục | Ý | Kết luận | Chỗ trả lời |
| :-- | :-- | :-- | :-- |
| 1 | Cấu trúc module | **Có** | [spec/04:380](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L380) |
| 1 | Code sạch, dễ mở rộng | **Có** | [spec/04:322](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L322), [ROADMAP:212](../../pitch/ROADMAP.md#L212) |
| 2 | Giao diện đẹp, mượt, đồng bộ | **Có** | [spec/30:264](../../spec/30_UI.md#L264) |
| 2 | Responsive, dễ tiếp cận | **Có** | [spec/30:269–271](../../spec/30_UI.md#L269-L271) |
| 2 | Tổ chức code FE | **Có** | [spec/30:90](../../spec/30_UI.md#L90), [spec/04:416](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L416) |
| 3 | API chuẩn | **Có** | [spec/03:57](../../spec/03_API_VA_LUU_TRU.md#L57) |
| 3 | Logic và database | **Có** | [spec/03:95](../../spec/03_API_VA_LUU_TRU.md#L95), [:287](../../spec/03_API_VA_LUU_TRU.md#L287) |
| 3 | Tốc độ, tối ưu truy vấn, tài nguyên | **Một phần** | [Mục tiêu](../../spec/02_CONTRACTS.md#L178) và [index](../../spec/03_API_VA_LUU_TRU.md#L153) có, số đo chưa có |
| 4 | Tự động build, lint, test | **Có** | [spec/04:322](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L322) |
| 4 | Tự động deploy | **Có** | [spec/04:351](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L351), qua Vercel sau khi merge |
| 4 | Môi trường staging | *Không có* | [spec/04:318](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L318) chỉ có Supabase cho dev |
| 5 | Bảo vệ dữ liệu người dùng | **Có** | [spec/03:224](../../spec/03_API_VA_LUU_TRU.md#L224), [spec/04:356](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L356) |
| 5 | Chống lỗ hổng phổ biến | **Một phần** | [spec/50:361–362](../../spec/50_TEST_VA_FIXTURE.md#L361-L362), [INV-03](../../spec/01_KIEN_TRUC_VA_LUONG.md#L25); không có quét lỗ hổng |
| 5 | Vận hành ổn định | **Có** | [spec/01:232](../../spec/01_KIEN_TRUC_VA_LUONG.md#L232), [spec/03:428](../../spec/03_API_VA_LUU_TRU.md#L428) |
| 6 | Test tự động | **Có** | [spec/50](../../spec/50_TEST_VA_FIXTURE.md), [spec/04:322](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L322) |
| 6 | Đóng gói ứng dụng | *Không có* | Không có Dockerfile trong thiết kế |
| 6 | Chạy ổn định, đủ tính năng | **Một phần** | [spec/50:348](../../spec/50_TEST_VA_FIXTURE.md#L348) là checklist, chưa có sản phẩm |

---

## V. Đóng góp và cộng đồng (10đ)

| Ý | Kết luận | Chỗ trả lời |
| :-- | :-- | :-- |
| Tác động tích cực rõ ràng | **Một phần** | [PB:10](../../pitch/PHAN_BIEN_BGK.md#L10) có nêu, chưa đo được |
| Phương án triển khai, nhân rộng | **Có** | [D-33](../../spec/00_QUYET_DINH.md#L53), [D-45](../../spec/00_QUYET_DINH.md#L65), [ROADMAP:72](../../pitch/ROADMAP.md#L72), [:129](../../pitch/ROADMAP.md#L129) |
| Khả năng tiếp cận | **Có** | [spec/30:264](../../spec/30_UI.md#L264), [D-33](../../spec/00_QUYET_DINH.md#L53) |
| Lợi ích lâu dài | **Có** | [ROADMAP:96](../../pitch/ROADMAP.md#L96), [:140](../../pitch/ROADMAP.md#L140) |

---

## VI. AI tiết kiệm chi phí (10đ)

| Ý | Kết luận | Chỗ trả lời |
| :-- | :-- | :-- |
| Tối ưu ngân sách, tài nguyên | **Có** | [INV-02](../../spec/01_KIEN_TRUC_VA_LUONG.md#L24), [AI-01](../../spec/20_AI_GOI_VA_PROMPT.md#L31), [AI-08](../../spec/20_AI_GOI_VA_PROMPT.md#L38) |
| Cân bằng chi phí, chất lượng, tốc độ | **Một phần** | [D-50](../../spec/00_QUYET_DINH.md#L70), [PB:332](../../pitch/PHAN_BIEN_BGK.md#L332); không có bảng so sánh model |
| Đo lường và tối ưu chi phí | **Một phần** | [spec/03:51](../../spec/03_API_VA_LUU_TRU.md#L51), [spec/30:75](../../spec/30_UI.md#L75) có đếm token, nhưng [số chi phí chưa đo](../../spec/02_CONTRACTS.md#L178) |

---

## VII. AWS hoặc Google Cloud (10đ)

| Ý | Kết luận | Chỗ trả lời |
| :-- | :-- | :-- |
| Deploy lên AWS hoặc Google Cloud | *Không có* | [spec/04:10](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L10), [PB:338](../../pitch/PHAN_BIEN_BGK.md#L338) đều chọn Vercel |
| Cấu hình production trên cloud, domain/IP công khai | *Không có* | Không có trên AWS hay Google Cloud |
| Quản lý tài nguyên, mạng, bảo mật cloud | *Không có* | Không nói về firewall hay security group; biến môi trường [nằm trên Vercel](../../spec/04_KIEN_TRUC_TRIEN_KHAI.md#L360) |

---

## VIII. Làm việc nhóm và trình bày (10đ)

| Ý | Kết luận | Chỗ trả lời |
| :-- | :-- | :-- |
| Làm việc nhóm, phân công | **Một phần** | [07:42](../../doc-de-hieu/07_ke_hoach_21h.md#L42), [:85](../../doc-de-hieu/07_ke_hoach_21h.md#L85); [vai D, E chưa phân](../../pitch/PHAN_BIEN_BGK.md#L82) khi phản biện |
| Trình bày bằng tình huống thực tế | **Có** | [KICH_BAN_DEMO.md:39](../../pitch/KICH_BAN_DEMO.md#L39) |
| Giải thích AI, dữ liệu, kỹ thuật | **Có** | [PB:70](../../pitch/PHAN_BIEN_BGK.md#L70), [PB:324](../../pitch/PHAN_BIEN_BGK.md#L324) |
| Phản biện về hiệu quả, giới hạn, chi phí, triển khai | **Một phần** | [PB:53](../../pitch/PHAN_BIEN_BGK.md#L53), [PB:105](../../pitch/PHAN_BIEN_BGK.md#L105); phần hiệu quả chưa có số |

---

## Hai lưu ý quan trọng

1. **Đính chính:** D-63 đã có người dùng cho việc tải repo lớn. Đề xuất của tui đổi thành D-64 cho Cloud Run và D-65 cho độc hại, thiên lệch.
2. **Có người đang sửa song song:** Số file sửa dở đã tăng từ 14 lên 17, và số dòng đổi ngay trong lúc tui đọc. Các link trên đúng tại thời điểm này, có thể lệch nếu file tiếp tục đổi. Tui không sửa file nào trong repo ở bước này.
