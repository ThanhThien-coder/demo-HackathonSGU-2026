# [TẦNG THUYẾT TRÌNH & DEMO] KỊCH BẢN PITCH DECK & DEMO 5 PHÚT TRƯỚC HỘI ĐỒNG SGU
## DỰ ÁN: SIMPLIFEY V2 PRO — CODEBASE COGNITIVE TWIN
### *Kịch bản Trình diễn Thực chiến 5 Phút & Cẩm nang Phản biện 8 Câu hỏi Khó (Phụ trách: NGƯỜI 1 - LEAD)*

---

| **Thuộc tính** | **Thông số kỹ thuật** |
| :--- | :--- |
| **Phân hệ** | `03_UI_VA_KICH_BAN/02_KICH_BAN_PITCH_DEMO.md` |
| **Người phụ trách** | **NGƯỜI 1 (LEAD ARCHITECT & PITCHER)** |
| **Thời lượng thuyết trình** | **Kịch bản 5 phút** (pitch + demo), Q&A riêng sau đó. Thể lệ chỉ ghi khung 10g00–11g30 ngày 01/11 cho tất cả các đội, **chưa quy định thời lượng mỗi đội** — cần xác nhận với BTC và cắt kịch bản cho khớp |
| **Đối tượng lắng nghe** | Ban Giám khảo Vòng thử thách (ThS. Nguyễn Trung Tín & Đ/c Hồ Minh Cảnh) — cần ngôn ngữ đời thường, ít thuật ngữ |
| **Phương án dự phòng** | Persona Simulator, Chế độ Demo Offline (dữ liệu **ghi lại từ output thật**), video demo quay từ bản chạy thật |
| **Số liệu** | Mọi con số trích từ bảng chuẩn `00_CORE_SPEC/01_TONG_QUAN_KIEN_TRUC.md` Mục 5 |

---

# 1. KỊCH BẢN THUYẾT TRÌNH TỪNG PHÚT (5-MINUTE MINUTE-BY-MINUTE SCRIPT)

```text
┌───────────────┬────────────────────────────────────────────────────────────────────────┐
│ THỜI GIAN     │ HÀNH ĐỘNG TRÊN MÀN HÌNH & LỜI THUYẾT TRÌNH CỦA PITCHER                 │
├───────────────┼────────────────────────────────────────────────────────────────────────┤
│ 00:00 - 01:00 │ NỖI ĐAU "VIBE-CODING":                                                 │
│ (Mở đầu)      │ • Lời thoại: "Kính thưa Hội đồng Giám khảo, nhiều sinh viên giờ gõ     │
│               │   prompt là có cả nghìn dòng code, app chạy được nhưng không giải      │
│               │   thích được luồng chạy khi thầy hỏi vấn đáp. SimpliFey giúp các bạn   │
│               │   hiểu chính đồ án của mình." (kèm 1 số liệu khảo sát có nguồn)        │
├───────────────┼────────────────────────────────────────────────────────────────────────┤
│ 01:00 - 02:00 │ DÁN LINK GITHUB ➔ VÀI GIÂY CÓ BẢN ĐỒ BÀI HỌC (0 TOKEN AI):             │
│ (Demo T0-T2)  │ • Thao tác: Dán link GitHub repo thật (hoặc upload .zip) ➔ Bấm Scan.   │
│               │ • Màn hình: Cột 1 hiện bản đồ 6–8 bài học 4 màu phân nhánh; đồng hồ    │
│               │   đo thời gian hiển thị số thật (mục tiêu < 1.5s).                     │
│               │ • Lời thoại (đời thường): "Bước này máy đọc cấu trúc code bằng toán,   │
│               │   không tốn một đồng tiền AI nào."                                     │
├───────────────┼────────────────────────────────────────────────────────────────────────┤
│ 02:00 - 03:00 │ PHA 1 — ĐỌC HIỂU:                                                      │
│ (Demo Cột 2&3)│ • Thao tác: Click vào Node màu Vàng 'Order Checkout'.                  │
│               │ • Màn hình: Cột 2 mở đoạn code thật của từng bước (≤ 30 dòng/bước);    │
│               │   Cột 3 Tab 1 chỉ cho thấy luồng chạy và Điểm Hay của thiết kế.        │
│               │ • Lời thoại: "Ở Pha 1, hệ thống chưa hỏi gì và cũng không lộ chỗ lỗi.  │
│               │   Sinh viên được đọc thoải mái để chuẩn bị."                           │
├───────────────┼────────────────────────────────────────────────────────────────────────┤
│ 03:00 - 04:00 │ PHA 2 — SÁT HẠCH FEYNMAN & ĐỔI MÀU NODE SANG XANH:                     │
│ (Demo AI & BKT│ • Thao tác: Bấm 'Bắt đầu Sát hạch' ➔ Tab 2. AI hỏi: 'Vì sao vòng lặp ở │
│               │   dòng 44–45 lại viết như vậy? (có thể dùng ví dụ đời thường)'.        │
│               │ • Thao tác: Nhập câu trả lời bằng ví dụ 'gọi món quán ăn' ➔ Bấm Nộp.   │
│               │ • Màn hình: Gemini chấm Đạt (92/95) ➔ Node chuyển XANH, mở khóa node   │
│               │   kế tiếp, lúc này mới hiện Điểm Dở (N+1 query) và cách sửa.           │
├───────────────┼────────────────────────────────────────────────────────────────────────┤
│ 04:00 - 05:00 │ GHI NHỚ & QUÊN: PERSONA SIMULATOR & HALF-LIFE DECAY:                   │
│ (Kết bài)     │ • Thao tác: Bấm nút chuyển sang 'Persona Senior sau 30 ngày nghỉ'      │
│               │   (nói rõ: đây là mô phỏng thời gian).                                 │
│               │ • Màn hình: Điểm kỹ năng giảm theo công thức quên, node đã học đổi     │
│               │   viền Vàng Cam, click vào là có câu hỏi ôn tập.                       │
│               │ • Lời kết: "SimpliFey biến việc hiểu code thành một hành trình có ghi │
│               │   nhớ. Xin cảm ơn quý Thầy và Ban Giám khảo!"                          │
└───────────────┴────────────────────────────────────────────────────────────────────────┘
```

---

# 2. CẨM NANG PHẢN BIỆN 9 CÂU HỎI BẪY CỦA HỘI ĐỒNG BAN GIÁM KHẢO SGU

1. **BGK hỏi:** *"Làm sao bóc tách Call-Graph cho cả Java, Go, Python mà không cần cài JVM hay Compiler nặng?"*
   > **Đáp:** *"Dạ thưa Thầy, chúng em dùng cơ chế **Two-Pass Global Symbol Resolution** chạy trên Tree-sitter WASM. Chặng 1 quét cây cú pháp, lập các bảng băm tra cứu ký hiệu trên RAM. Chặng 2 đối chiếu lời gọi hàm qua bảng băm để liên kết mà không cần bất kỳ trình biên dịch nào. Với ngôn ngữ đã có bộ phân giải import riêng (TypeScript/JavaScript, Python... nhóm đã kiểm chứng), độ chính xác cạnh cao. Với hơn 100 ngôn ngữ còn lại có Tree-sitter, hệ thống vẫn vẽ được đồ thị bằng bộ phân giải phổ quát, nhưng cạnh được gắn nhãn 'suy luận' (nét đứt) vì không đảm bảo 100%, chúng em không giấu điều đó!"*

2. **BGK hỏi:** *"Nếu mã nguồn có 2 file gọi vòng tròn nhau (A gọi B, B gọi A) thì đồ thị của các em có bị treo vòng lặp vô tận không?"*
   > **Đáp:** *"Dạ không ạ! Hệ thống áp dụng **Thuật toán Tarjan SCC**: phát hiện các chu trình phụ thuộc và co cụm (Condensation) chúng thành 1 Super-Node, nên đồ thị sau co cụm luôn là đồ thị có hướng không chu trình (DAG)."*

3. **BGK hỏi:** *"PageRank trên mã nguồn thì các file tiện ích như `logger.ts` sẽ đứng Top 1 vì ai cũng gọi nó, còn Controller không ai gọi tới thì phải thấp nhất chứ?"*
   > **Đáp:** *"Dạ đúng ạ, PageRank thuần sẽ xếp sai như Thầy nói. Vì vậy chúng em làm hai việc: (1) loại các file tiện ích (out-degree = 0 và tên đúng là `logger`, `utils`, `db`, `config`...) ra khỏi **bảng xếp hạng** — chúng vẫn nằm trong đồ thị; (2) cộng điểm cho các file là **cửa vào** (route, controller) phát hiện được trên cây cú pháp. PageRank chỉ là một tín hiệu xếp hạng, còn gốc của mỗi bài học là cửa vào và các hàm thuật toán phức tạp."*

4. **BGK hỏi:** *"Chỉ số Uncle Bob nếu tính trên file `service.ts` viết theo Functional Programming không có Interface thì có bị chia cho 0 và kết tội oan không?"*
   > **Đáp:** *"Dạ, công thức của chúng em có **Guard-clause** chống chia cho 0 và miễn trừ khi lát cắt không có cú pháp interface. Đặc biệt, bộ chỉ số được tính trên **Phạm vi Cụm Lát Cắt (Slice Scope)** — gom cả file service và file DTO/Types được import vào — nên phản ánh đúng bản chất cân bằng của toàn cụm chứ không xét đơn lẻ từng file!"*

5. **BGK hỏi:** *"Làm sao các em đảm bảo AI không bịa ra các công nghệ ngoài lề như Kafka, Redis khi đồ án sinh viên chỉ dùng SQLite?"*
   > **Đáp:** *"Dạ, hệ thống có **Cổng Gác Nhị Phân 2 Chốt** chạy trong khoảng 1 mili-giây: Chốt 1 đối chiếu mọi tên hàm/biến AI nhắc tới với danh sách ký hiệu có thật trong code; Chốt 2 quét danh sách công nghệ không có trong manifest của repo. Vi phạm là bị loại và thay bằng câu hỏi truy vết cú pháp. Cổng gác chặn được việc bịa tên và bịa công nghệ; còn giải thích sai về ý nghĩa thì chúng em giảm bằng prompt và đáp án tham chiếu, chứ không dám nói là loại bỏ hoàn toàn."*

6. **BGK hỏi:** *"Ở Pha 1 cho sinh viên xem kỹ rồi, thì sang Pha 2 AI hỏi sinh viên chỉ việc đọc chép lại là được điểm à?"*
   > **Đáp:** *"Dạ không ạ. Pha 1 chỉ cho xem luồng chạy và Điểm Hay; **Điểm Dở được giấu** (cả trên giao diện lẫn trong dữ liệu gửi về trình duyệt) cho tới khi sinh viên trả lời đạt hoặc sai đủ 3 lần. Câu hỏi Pha 2 bám vào dòng code cụ thể, và tiêu chí đạt là **giải thích đúng vì sao code viết như vậy, bám đúng code thật** — dùng thuật ngữ hay ẩn dụ đều được, nhưng đọc thuộc định nghĩa mà không chỉ ra trong code thì vẫn trượt."*

7. **BGK hỏi:** *"Nếu trong lúc thi mất mạng Wi-Fi thì sản phẩm của các em có chạy được không?"*
   > **Đáp:** *"Dạ có phương án dự phòng: bấm `Ctrl + Shift + D` để chuyển sang **Chế độ Demo Offline**. Dữ liệu ở chế độ này là **bản ghi lại output thật** của engine và AI trên repo mẫu, và giao diện hiện rõ nhãn 'Offline' — chúng em sẽ nói rõ mỗi khi chuyển chế độ. Ngoài ra nhóm có video demo quay từ bản chạy thật."*

8. **BGK hỏi:** *"Tôi thấy các em vẽ Controller với Service rất hay, nhưng nếu sinh viên nộp đồ án Mobile Flutter BLoC, React Native Redux hoặc Monorepo cả client lẫn server thì hệ thống của các em có bóc tách được không, hay lại báo lỗi trắng trang?"*
   > **Đáp:** *"Dạ thưa Thầy, hệ thống không đóng cứng vào Web Backend 3 tầng:  
   > • **Monorepo:** Bộ quét Multi-Manifest nhận diện cặp thư mục `client/` và `server/`, ưu tiên phân tích Backend và cho phép chọn lại thư mục trên giao diện.  
   > • **Mobile / Frontend:** hệ thống nhận diện hình thái dự án (6 archetype) và đổi nhãn các tầng (Màn hình ➔ ViewModel/BLoC ➔ API Client). Riêng luồng đứt tại `dispatch(Event)` của BLoC/Redux thì cầu nối sự kiện (Nominal Event Bridge) **nằm trong lộ trình sau cuộc thi**; hiện tại các luồng đó có thể bị thiếu một mắt xích.  
   > • **Chống báo lỗi giả:** Hệ thống **miễn trừ chỉ số Uncle Bob** cho màn hình UI và chỉ đo trên tầng logic để không kết tội oan đồ án của sinh viên."*

9. **BGK hỏi:** *"Các em nói không lưu code, vậy làm sao hệ thống nhớ được sinh viên đã học tới đâu? Mở máy khác là mất hết à? Và các em có giữ code đồ án của sinh viên không?"*
   > **Đáp:** *"Dạ, chúng em **lưu tiến trình học, không lưu code**. Cơ sở dữ liệu Postgres chỉ giữ điểm 16 kỹ năng, tiến độ từng trạm và câu trả lời của sinh viên, kèm **mã commit** của repo. Vì engine của chúng em là tất định, khi sinh viên quay lại (trên bất kỳ máy nào, sau khi đăng nhập GitHub), hệ thống tải lại đúng commit đó và dựng lại y hệt bản đồ trong chưa tới 1.5 giây, rồi ghép tiến độ cũ vào. Điểm kỹ năng do **server** tính và ghi, trình duyệt không sửa được, nên sinh viên cũng không tự nâng điểm hay mở đáp án sớm được. Mã nguồn chỉ nằm trong RAM lúc phân tích rồi được giải phóng."*
   >
   > *Demo gợi ý (15 giây):* mở trang trên máy thứ hai đã đăng nhập cùng tài khoản ⇒ danh sách "Tiếp tục học" ⇒ bấm vào repo vừa học ⇒ các trạm xanh vẫn còn.
