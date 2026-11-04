# B08 — Sửa theo repo demo, tất định, hàng điểm bắt đầu

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 20:00–22:00 (H+8 → H+10) |
| Nhánh | `b/B08-repo-demo` |
| Cần có trước | B07, A06; chạy song song E06 (Vai E chạy repo demo và báo lỗi engine) |
| Mở đường cho | B09, Lát dọc 2 (00:00) |
| Cách làm | agy sửa lỗi · Claude kiểm · bạn chạy repo demo và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b b/B08-repo-demo
```

## Bước 1 — Tạo task (dán cho Claude)

Trước khi dán, mở tab Issues trên GitHub (lọc nhãn `engine`) và `review/loi_da_gap.md`, rồi thay dòng `<dán số Issue …>` trong prompt bằng danh sách lỗi thật.

```text
Dùng skill tao-task để tạo task tên "B08 — Sửa theo repo demo, tất định, hàng điểm bắt đầu". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: B07, A06; chạy song song E06 (Vai E chạy repo demo và báo lỗi engine). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/10_ENGINE_INGEST.md` toàn bộ
- `docs/spec/11_ENGINE_DO_THI.md` toàn bộ
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 4 (X-01, X-07), Mục 5 dòng 1–3
- `docs/spec/00_QUYET_DINH.md` D-55, D-56, Q-03
- `package.json`
- `src/`

## Được ghi
- `src/server/engine/` (thư mục, trừ `__fixtures__/` của Vai E)
- `src/server/engine/__tests__/repo-demo.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: (Nếu E06 đã có Issue thì dán vào; chưa có thì làm theo các ý dưới.) Phối hợp sửa các lỗi phát hiện khi chạy engine trên repo demo Q-03 và `shop-api` đối chiếu `docs/spec/50_TEST_VA_FIXTURE.md` Mục 5 dòng 1–3 và các lỗi engine tôi dán dưới đây; chỉ sửa lỗi trong `src/server/engine/`.
   - Lượt này (03/11): E06 (#54) chưa báo lỗi nào, repo demo Q-03 chưa chọn ⇒ theo mặc định Q-03 dùng repo `shop-api` tự viết theo `docs/spec/50_TEST_VA_FIXTURE.md` Mục 1. Tự dựng repo đó **trong RAM ngay trong test** (zip bằng `fflate`, không ghi đĩa, không sửa `__fixtures__/` của Vai E): đủ các file trong `file_index` của `src/server/engine/__fixtures__/shop-api.json` (17 file: routes auth/cart/order/user, controllers product/report, middleware auth, services, repos, clients/mailer) và 7 luồng như bản vẽ tay (Đăng ký, Hồ sơ, Giỏ hàng, Danh sách sản phẩm, Thanh toán, Báo cáo doanh thu, Gửi email), router mount kiểu `app.use("/api/orders", router)`, dùng nguyên code bước N2, N3, N5 của Mục 1.2. Chạy `runEngine`, so với DoD `50` Mục 5 dòng 1–3; lỗi engine tìm thấy thì sửa trong `src/server/engine/` và ghi vào báo cáo.
   - `shop-api.json` là bản vẽ tay (Mục 1.1: "khi chạy engine thật, đồ thị engine sinh là chuẩn") ⇒ KHÔNG so khớp từng chữ id/tên; chỉ so hình dạng: mỗi luồng có lát cắt, tầng bước hợp lý, số node trong khoảng DoD.
   - Khi E06 mở Issue `bug` + `engine` thì làm lượt 2 trên nhánh `b/fix-<issue>`.
3. B2: Viết test trong `src/server/engine/__tests__/repo-demo.test.ts` kiểm tra tính tất định X-01 (chạy engine 2 lần cùng zip, so `JSON.stringify`) và kiểm tra bố cục bản đồ X-07 (hàng điểm bắt đầu, cạnh thuật toán D-55, D-56).
4. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/server/engine`
- Test X-01 (tất định) và test X-07 (hàng điểm bắt đầu) chạy xanh.
- Có test DoD dòng 1–3 trên repo shop-api trong RAM: `CONFIG.DISPLAY_MIN_NODES` ≤ số node ≤ `CONFIG.DISPLAY_MAX_NODES`; chạy 2 lần cùng `id` và cùng `position`; mọi node `prerequisites = []` cùng `position.y` nhỏ nhất; node `algo-*` được lát cắt gọi tới có cạnh nối (nếu repo có).
- `npm run typecheck`, `npx vitest run src/server/engine`, `npx eslint src/server/engine` (0 warning) đều sạch.
- Bản đồ `shop-api` có đúng 6 cạnh N1→N2, N2→N4, N3→N5, N4→N5, N6→N5, N7→N5. N5 là Capstone, điểm bắt đầu là N1, N3, N6, N7. Theo D-07 (dễ → khó) và D-12 (Capstone phức tạp nhất) thì không bài nào dùng chung hàm với N5 đứng sau N5 được.
- Không kết luận engine xong chỉ vì test xanh trên `shop-api`: phải chạy `runEngine` trên ít nhất 1 repo Express JS, 1 repo TS, 1 repo NestJS, 1 repo FastAPI, 1 repo Expo công khai, đếm số luồng tới `DATA_ACCESS`.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Kiểu nội bộ (spec ghi `// nội bộ`) chỉ khai báo ở `src/server/engine/ingest/types.ts` (Tầng 0) hoặc `src/server/engine/graph/types.ts` (Tầng 1–2); file khác `import type` từ đó. Không khai báo lại kiểu đã có ở `@/contracts` hay `types.ts`, không đổi tên hay xóa trường đã có. Cần đổi kiểu phiếu trước đã tạo thì đổi trạng thái `kẹt` và ghi rõ kiểu nào.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Test chạy thật `runEngine` đặt `vi.setConfig({ testTimeout: 30_000 })` (tránh đỏ chập chờn khi máy tải nặng). Tên test bắt đầu bằng mã X-01, X-07 hoặc ENG. Giá trị giả giống khóa theo luật README (hook quét khóa). Không `Math.random`, không `localeCompare`.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "B08 — Sửa theo repo demo, tất định, hàng điểm bắt đầu" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/server/engine` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Soi bản đồ repo `shop-api` (in tóm tắt node và bước): mỗi lát cắt đi tới DATA_ACCESS, không chỉ đếm số node. Lần tập, đủ 7 node mà lát cắt cụt ở ENTRY/MIDDLEWARE.
- [ ] Test X-01 và X-07 chạy xanh.
- [ ] Tự chạy engine trên repo demo xác nhận số node trong khoảng `CONFIG.DISPLAY_MIN_NODES`–`CONFIG.DISPLAY_MAX_NODES` và mọi điểm bắt đầu nằm cùng hàng trên cùng.
- [ ] Đã chạy trên repo công khai ngoài `shop-api`, ghi số luồng có từ 2 bước và số luồng tới `DATA_ACCESS` của từng repo.

```text
Task "B08 — Sửa theo repo demo, tất định, hàng điểm bắt đầu" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/engine/
git commit -m "fix(engine): khắc phục lỗi nhận diện route và cạnh lát cắt trên repo demo"
git add src/server/engine/__tests__/repo-demo.test.ts
git commit -m "test(engine): tất định, hàng điểm bắt đầu"
git pull --rebase origin main
git push -u origin b/B08-repo-demo
gh pr create --base main --title "B08 — Sửa theo repo demo, tất định, hàng điểm bắt đầu" --body "Closes #<số Issue>"
```

Báo cho Vai E rằng engine đã sửa xong theo repo demo để Vai E tiến hành kiểm thử E06. Vai A merge khi CI xanh.

## Tiếp theo

→ [B09](B09-tai-chon-loc.md)
