# E06 — Chạy repo demo trên engine thật

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 20:00–22:00 (H+8 → H+10) · **Lát dọc 1 (20:00)** |
| Nhánh | `e/E06-repo-demo` |
| Cần có trước | Lát dọc 1 (A07, B07, C06, D06 lên `main` lúc 20:00; trễ thì chờ Vai A báo) |
| Mở đường cho | B08 |
| Cách làm | Bạn tự làm · bạn commit |

**Cách nhanh:** nhắn AI `Làm phiếu E06`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b e/E06-repo-demo
```

## Bước 1 — Tạo task (dán cho Claude)

Không cần tạo task: phiếu này bạn tự làm theo Bước 3.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

Không có, bạn tự làm theo Bước 3.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Bạn tự chạy lại `git diff --stat main -- review/loi_da_gap.md` thấy có thay đổi ở file `review/loi_da_gap.md`.
- [ ] `git status` chỉ có các file ở mục Được ghi (`review/loi_da_gap.md`).
- [ ] Dán link repo demo: bản đồ ra 6–20 node, đồng hồ đo hiện `ingest_ms + engine_ms` thật theo `docs/spec/50_TEST_VA_FIXTURE.md` Mục 5.
- [ ] Chạy 2 lần cùng một link repo: cùng `node_id` và cùng tọa độ (INV-10).
- [ ] Hàng điểm bắt đầu nằm cùng hàng trên cùng (X-07).
- [ ] Thử nghiệm các ca lỗi: repo private / sai link / repo rỗng / quá lớn trả đúng mã lỗi và thông điệp theo `docs/spec/30_UI.md` Mục 10.
- [ ] Mở từng node của repo demo: node nào cũng có bản phân tích (D-46), phần X-Ray có điểm hay và điểm dở "Nhận định của AI".
- [ ] Mỗi dòng DoD đã chạy có kết quả ✅ / ❌ ghi trong `review/loi_da_gap.md`.
- [ ] Mỗi lỗi tìm thấy được mở một GitHub Issue với nhãn `bug` + nhãn vai liên quan (`engine`, `ai`, `api`, `ui`).
- [ ] Chạy thêm 1 repo NestJS nghiệp vụ. Đọc nội dung 3 bài: code đúng method, có bài tới `DATA_ACCESS`, không có bài từ `config.get`, `<module>`, file test (lỗi B-01, B-02, B-03, B-06, B-27).
- [ ] Học trọn 1 vòng trên site thật ở 1366×768: bấm node vào bài, nộp đúng, nộp sai, xem Tổng quan, Báo sai (lỗi D-05, D-07, D-15).
- [ ] Dán 5 repo chưa dùng, không có `ERR_NETWORK_TIMEOUT` (lỗi B-14). Dán repo Go, báo chưa hỗ trợ (lỗi B-07).

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add review/loi_da_gap.md
git commit -m "docs(test): lỗi lát dọc 1"
git pull --rebase origin main
git push -u origin e/E06-repo-demo
gh pr create --base main --title "E06 — Chạy repo demo trên engine thật" --body "Closes #<số Issue>"
```

Báo Vai B (B08) kết quả chạy repo demo và các lỗi engine nếu có để Vai B sửa. Vai A merge khi CI xanh.

## Tiếp theo

→ [E07](E07-review-run.md)
