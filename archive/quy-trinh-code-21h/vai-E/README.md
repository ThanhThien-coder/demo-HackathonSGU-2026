# Vai E — Kiểm thử, kịch bản, demo, slide

Bạn phụ trách kiểm thử toàn diện hệ thống theo từng giai đoạn hoàn thiện của quy trình 21 giờ: chuẩn bị các fixture kiểm thử ngay từ đầu giờ, xây dựng các hàm thuần lọc đầu vào (bộ lọc an toàn, kiểm tra độ tương đồng và chống prompt injection), kiểm thử tích hợp xuyên module và kịch bản end-to-end, thực hiện quy trình duyệt tay chất lượng đầu ra AI trên repo demo, kiểm tra Definition of Done và chế độ offline, chuẩn bị video demo dự phòng, hoàn thiện slide thuyết trình và nộp bài.

Đọc chung: [README tổng](../README.md) · lịch gốc [`07`](../../../doc-de-hieu/07_ke_hoach_21h.md)

## Một phiếu làm thế nào

Mỗi phiếu đọc từ trên xuống, làm đúng thứ tự:
1. Bước 0: tự gõ lệnh cập nhật `main`, cài thư viện, tạo nhánh.
2. Bước 1: copy prompt, dán cho Claude trên máy bạn. Claude tạo task trong `.kb/tasks/`. Đọc task, thấy khớp phiếu thì đi tiếp.
3. Bước 2: copy prompt, dán cho Claude. Claude giao agy viết file, rồi tự kiểm và báo kết quả. Claude không commit.
4. Bước 3: bạn tự kiểm theo danh sách ô. Đủ hết ô mới là xong. Chưa đạt thì dán prompt làm lại (tối đa 1 lần).
5. Bước 4: bạn tự gõ lệnh commit, push, mở PR. Vai A merge.
6. Sang phiếu ở mục Tiếp theo.
AI không bao giờ commit hay push. Commit là của bạn: luật thi yêu cầu mọi thành viên phải có commit.

Máy không có Antigravity (agy) hoặc không có ai-kit: làm cùng phiếu này theo [`khong-co-ai-kit.md`](../khong-co-ai-kit.md).

## Lịch của bạn

| Giờ | Phiếu | Ghi chú |
| :-- | :-- | :-- |
| 12:00–12:30 | [E01](E01-fixture-shop-api.md) | Bạn tự tạo GitHub Issues cho mọi task của 5 vai trên web GitHub |
| 12:30–13:00 | [E01](E01-fixture-shop-api.md) · **Mốc H+0.5: PR thử CI** | Fixture `shop-api.json`, mở PR ngay để thử pipeline CI |
| 13:00–14:30 | [E02](E02-fixture-ai.md) | 4 file fixture phản hồi AI, test khớp kiểu contracts |
| 14:30–16:00 | [E03](E03-forbidden-moderation.md) · **Mốc H+4** | Bảng công nghệ cấm, quét từ cấm, bộ lọc an toàn `maskSensitive` |
| 16:00–17:30 | [E04](E04-injection-similarity.md) | Regex chống tấn công prompt injection, kiểm tra độ dài và độ tương đồng |
| 17:30–20:00 | [E05](E05-kich-ban-ham.md) | Test kịch bản mức hàm A, B, C, E, bộ câu trả lời mẫu, khung duyệt tay |
| 20:00–22:00 | [E06](E06-repo-demo.md) · **Lát dọc 1 (20:00)** | Bạn tự chạy repo demo trên engine thật, kiểm bản đồ và phân tích |
| 22:00–00:30 | [E07](E07-review-run.md) · **Lát dọc 2 (00:00)** | Script chạy duyệt `review-run.ts`, bạn chạy kịch bản A/B thật trên giao diện |
| 00:30–03:00 | [E08](E08-kiem-xuyen.md) | Test xuyên module, chạy tay kịch bản D, X-tests, duyệt tay lần 1, slide nháp |
| 03:00–05:00 | 💤 Ngủ | Khoảng nghỉ 2 giờ; Vai C duyệt tay tiếp, Vai D sửa giao diện |
| 05:00–07:00 | [E09](E09-dod.md) · **Mốc H+17, H+19** | Definition of Done, offline `Ctrl+Shift+D`, quay video dự phòng |
| 07:00–09:30 | [E10](E10-slide-nop.md) · **Mốc H+19.5, H+21** | Điền số đo thật vào bảng duyệt, hoàn thành slide 07:30, nộp trước 09:30 |

## Việc lặp lại suốt 21 giờ

- **Ghi nhận lỗi:** Mỗi lỗi tìm thấy trong quá trình kiểm thử thì lập tức mở một GitHub Issue với nhãn `bug` kết hợp cùng nhãn vai liên quan (`engine`, `ai`, `api`, `ui`). Trong Issue phải ghi rõ các bước tái hiện cụ thể. Đồng thời, ghi thêm một dòng vào file `review/loi_da_gap.md`.
- **An toàn thông tin:** Vì repo thi là public, trong nội dung GitHub Issue chỉ ghi tên việc, người nhận và các bước tái hiện; không bao giờ dán khóa bí mật hay token.
- **Theo dõi sau sửa lỗi:** Khi một lỗi có nhãn `bug` được merge bản vá vào nhánh chính `main`, chạy lại ca kiểm thử tương ứng để xác nhận lỗi đã được khắc phục hoàn toàn.

## Bạn chờ ai, ai chờ bạn

Vai E gồm 3 phần công việc rõ ràng:
1. Code thật từ H+1: fixture (`shop-api.json`, fixture AI), cụm hàm "lọc đầu vào" nhận từ C (`src/lib/moderation.ts`, `src/lib/similarity.ts`, `src/server/ai/guard/forbidden.ts`, `src/server/ai/guard/injection.ts`).
2. Kiểm thử theo đúng lúc hệ thống chạy được: chạy repo demo sau lát dọc 1 lúc 20:00, kịch bản A/B sau lát dọc 2 lúc 00:00.
3. Duyệt tay, demo, slide.

- **Bạn chờ ai:**
  - Chờ A03 (workflow CI) merge để mở PR thử CI (E01).
  - Chờ A02 (contracts) cho test fixture (E02), bộ lọc an toàn (E03), regex và similarity (E04).
  - Chờ C02 (`bkt-engine`), C03 (`plan`, `derive`) để viết test kịch bản mức hàm (E05).
  - Chờ Lát dọc 1 (A07, B07, C06, D06) lúc 20:00 để chạy repo demo trên engine thật (E06).
  - Chờ Lát dọc 2 (A10, D08) lúc 00:00 để chạy kịch bản A/B trên giao diện (E07).
- **Ai chờ bạn:**
  - Vai D và C chờ E01, E02 (các fixture) để dựng giao diện và test cổng gác.
  - Vai B chờ E03 (`maskSensitive` ở cửa nhận repo).
  - Vai C dùng `findForbidden` từ E03.
  - Vai A chờ E03 (`hasInappropriateWords`, `maskSensitive`) và E04 (`isInjection`, `similarity`) cho route `/api/evaluate-feynman` (A10).
- **Phối hợp review:** PR E03 và E04 bắt buộc phải nhờ Vai C review vì Vai C gọi `findForbidden` và trực tiếp gắn kết với hệ thống cổng gác AI.

## Về đích (05:00 → 09:30)

- **05:00 — Đóng băng tính năng & Kiểm tra DoD:** Toàn đội ngừng tiếp nhận tính năng mới. Bạn tự thực hiện kiểm tra Definition of Done theo danh sách tại `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 5. Kiểm tra chế độ offline `Ctrl+Shift+D` cùng Vai D.
- **06:00 — Video dự phòng:** Quay video demo kịch bản hoàn chỉnh (cả chế độ kết nối thật và chế độ offline) để dự phòng mọi tình huống kỹ thuật trên sân khấu.
- **07:00 — Điền số đo thật:** Mở `review/ket_qua_duyet.md` và điền phần "Số đo báo cáo" theo đúng hướng dẫn tại `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 10 bằng số liệu thực tế đo được từ bảng duyệt tay.
- **07:30 — Hoàn tất slide:** Slide thuyết trình hoàn thiện lúc 07:30 từ kịch bản trình bày tại `pitch/` (mở ở repo tài liệu: `pitch/KICH_BAN_DEMO.md`).
- **09:00 — Ngừng code & Đối soát commit:** Cả nhóm dừng code, đối soát để bảo đảm cả 5 thành viên đều có commit hợp lệ trên `main`.
- **09:30 — Nộp bài:** Nộp file thuyết trình trước 09:30 theo đúng quy định của ban tổ chức cuộc thi.
