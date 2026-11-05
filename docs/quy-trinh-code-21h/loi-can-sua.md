# Danh sách lỗi cần sửa sau khi deploy

Cập nhật: 05/11/2026, theo `main` commit `ab6ac69`. Site: https://demo-hackathon-sgu-2026.vercel.app/

Cách dùng: test từng dòng trên site, ghi vào cột **Kết quả test**: `còn lỗi`, `hết lỗi` hoặc `bỏ qua`.

Mức độ: **Nặng** là ban giám khảo thấy ngay khi mở bài. **Vừa** là khó dùng hoặc gây hiểu sai. **Nhẹ** là chưa ảnh hưởng người học.

## Đã xong

| Mã | Lỗi | Nguyên nhân | Người sửa |
| :-- | :-- | :-- | :-- |
| X01 | Mọi bài báo "Chưa phân tích được" | App gửi `thinkingBudget: 0`, Google trả lỗi 400 | Phat107, commit `e94055b` |

## Vai B — Engine

| Mã | Mức | Lỗi | Cách test | Sửa ở đâu | Trạng thái | Kết quả test |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| B-01 | Nặng | Bài NestJS hiện code của method khác. BrewLite 11/17 route, repo demo 14/18 bài | Quét repo NestJS chưa từng quét, mở `Get Order`: bước đầu không được có `create` | `symbols.ts`, `getStartLineWithDecorators` | Có bản sửa ở nhánh `b/fix-nest-buoc-dau`, commit `1066d4d`, chưa vào `main` | |
| B-02 | Nặng | Capstone lấy từ file test (E06-12) | Xem bài Capstone: file không được là `.spec` hay `test_` | `nodes.ts`, `selective.ts`, TASK_20 | Chưa làm | |
| B-03 | Vừa | `config.get()` thành route giả: `List Jwt_expires_ins`, `Charge` | Quét BrewLite, tìm 2 bài này | `callgraph.ts`, TASK_20 | Chưa làm | |
| B-04 | Vừa | Nhiều bài mở sẵn: BrewLite 13/20, `nestjs/nest` 19/20 | Quét repo, đếm bài chưa khóa lúc đầu | `nodes.ts`, TASK_21, thêm D-73 | Chưa làm, đổi cách khóa bài nên cần cân nhắc | |
| B-05 | Vừa | Nhiều node lẻ, bản đồ dàn hàng ngang quá dài | Mở bản đồ BrewLite | `nodes.ts`, TASK_21; cần thêm D-01 | Chưa làm | |
| B-06 | Vừa | BrewLite và `nestjs/nest` có 0 luồng tới tầng dữ liệu. Nghi engine chưa nhận lời gọi Prisma | Xem nhãn tầng của bước gọi Prisma | Chưa xác định | Chưa xác minh | |
| B-07 | Vừa | Repo Java báo không có code (E06-10) | Quét `huynhthanhnhannnh-pixel/SGU-quan-ly-nha-hang` | Chưa xác định | Chưa xác minh | |
| B-08 | Nhẹ | Có node 0 bước (E06-11), có thể đã hết sau TASK_16 | Chạy lại repo demo, mở từng bài | Chưa xác định | Cần chạy lại | |
| B-09 | Nhẹ | `tech_stack` lẫn thư viện dev và frontend | Xem danh sách thư viện ở Tổng quan | Tầng nhận diện dự án | Chưa làm | |

Sau khi sửa B-01, B-02 hoặc B-03 phải đổi `ENGINE_VERSION`. Nếu không, repo đã phân tích vẫn dùng phiên và phân tích AI cũ. Khi đổi, các phiên cũ phải quét lại repo.

## Vai C — AI

| Mã | Mức | Lỗi | Cách test | Sửa ở đâu | Trạng thái | Kết quả test |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| C-01 | Vừa | Gemini lỗi nhưng server không ghi log, màn hình lại giống hệt mọi loại lỗi | Xem log Vercel khi có bài phân tích hỏng | `callLLMOnce` trong `gemini.ts` | Chưa làm | |
| C-02 | Vừa | Rủi ro: `ANALYZE` 900 token có thể bị cắt với tiếng Việt | Phân tích hết các bài của repo demo, đếm bài lỗi | `LLM_MAX_OUTPUT_TOKENS` trong `config.ts` | Cần đo trên AI thật | |

## Vai D — Giao diện

| Mã | Mức | Lỗi | Cách test | Sửa ở đâu | Trạng thái | Kết quả test |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| D-01 | Vừa | Bản đồ mở ở zoom 0,20–0,32, chữ gần như không đọc được | Mở bản đồ 20 node | `DagCanvas.tsx`: bỏ `fitView` lúc mở, căn vào bài đang học; sửa T32 | Chưa làm | |
| D-02 | Vừa | Thiếu nút Controls dù spec yêu cầu | Tìm nút zoom trên bản đồ | `DagCanvas.tsx` | Chưa làm | |
| D-03 | Nhẹ | Nhãn "Luồng chính" gây hiểu sai, nên là "Lộ trình học chính" | Xem Tổng quan | `RepoOverviewModal.tsx` | Chưa làm | |
| D-04 | Nhẹ | Thông báo lỗi repo thiếu phần hướng dẫn của spec (E06-06, E06-07) | Nhập repo không tồn tại, repo không có code | `src/lib/messages.ts` | Chưa làm | |

## Vai A — Tích hợp, deploy

| Mã | Mức | Lỗi | Cách test | Sửa ở đâu | Trạng thái | Kết quả test |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| A-01 | Vừa | Workflow `deploy` lên Cloud Run thất bại 6 lần gần nhất vì thiếu xác thực GCP. Site Vercel không bị ảnh hưởng | Xem tab Actions | Secret GitHub, hoặc tắt workflow nếu chỉ dùng Vercel | Chưa làm | |
| A-02 | Vừa | `toErrorResponse` che lỗi thật, log chỉ có tên lỗi | Xem log khi API trả lỗi lưu tiến độ | `src/server/errors.ts` | Chưa làm | |
| A-03 | Vừa | Từng gặp 401 "Phiên đăng nhập đã hết hạn" chưa rõ nguyên nhân | Dùng lâu sau khi đăng nhập, mở lại tab | Chưa xác định | Chưa tái hiện được | |
| A-04 | Nhẹ | `assertGeminiEnv` không chạy lúc khởi động, thiếu biến AI chỉ lộ khi gọi Gemini | Xem log khởi động | Chưa có `instrumentation.ts` | Chưa làm | |
| A-05 | Nhẹ | A06: `analyses: {}` chưa làm | Mở lại phiên đã phân tích, xem phân tích có hiện ngay không | `src/app/api/ingest/route.ts` | Chưa làm | |
| A-06 | Nhẹ | PR #124 chưa merge nên báo cáo tiến độ và phiếu Vai B trên `main` còn cũ | Xem PR #124 | Vai A merge | Chờ merge | |

## Chưa kiểm được

- AI thật và đăng nhập GitHub trên site, Claude chưa đăng nhập được.
- Biến môi trường và log của Vercel.
- Giao diện sau đăng nhập, ngoài các ảnh chụp màn hình.
