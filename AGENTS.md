# AGENTS.md — luật riêng của repo code tập dượt SimpliFey

Repo **code tập dượt** cho dự án SimpliFey (hackathon SGU 2026), copy từ repo tài liệu cũ để nhóm code thử 21 giờ trước vòng thi thật. Code sản phẩm nằm ở đây (Next.js 15 trong `src/`), tài liệu nằm trong `docs/`. Chi tiết dự án: `CLAUDE.md`. Luật chung của đội nằm ở `ai-kit`, file này chỉ giữ luật riêng của repo.

## Bản đồ
- `src/` — code ứng dụng. Lệnh kiểm: `npm run typecheck`, `npm run lint`, `npm test`.
- `docs/quy-trinh-code-21h/` — phiếu việc 21 giờ theo vai (`vai-A` … `vai-E`).
- Các thư mục dưới đây nằm trong `docs/` (bản chép `spec/`, `doc-de-hieu/` cũng có trong `.kb/`).
- `spec/` — nguồn quy chuẩn duy nhất. `00` quyết định · `01` kiến trúc & luồng · `02` mọi kiểu + bảng `CONFIG` · `03` API & DB · `04` triển khai · `05` hạ tầng cloud · `10`,`11` engine, `12` bảng mẫu entry · `20`,`21`,`22` AI & BKT · `30` UI · `50` test.
- `pitch/` — tài liệu thuyết trình, không dùng để code. `spec/` thắng khi lệch.
- `doc-de-hieu/` — bản giải thích cho người đọc, không dùng để code. `spec/` thắng khi lệch. Riêng `07_ke_hoach_21h.md` là nơi gốc của lịch 21 giờ.
- `.kb/` — thư mục riêng của từng máy, không commit, dựng bằng `ak bat-dau`. Trước khi làm việc, đọc `.kb/README.md`.
- **Không đọc** `archive/` trừ khi task chỉ định.

## Luật cứng
1. Một sự thật một chỗ: kiểu dữ liệu chỉ ở `spec/02` (ngoại lệ: kiểu ghi `// nội bộ` chỉ dùng trong 1 file spec được để tại file đó; kiểu đi qua API, ghi DB hoặc dùng ở ≥ 2 file spec phải ở `spec/02`); con số chỉ ở bảng `CONFIG` của `spec/02`. File khác gọi bằng tên (`CONFIG.MAX_CLEAN_FILES`, `D-27`, `BKT-41`).
2. Đổi quyết định: sửa dòng D-xx ở `spec/00` trước, rồi mới sửa file đích.
3. Không phá bất biến INV-01..13 (`spec/01` Mục 2). Không hứa "100%". Không nhận là mình phát minh BKT / PageRank / Tree-sitter.
4. Không bịa số đo (độ trễ, chi phí, số người dùng). Số chưa đo ⇒ ghi "mục tiêu / ước tính, chưa đo".
5. Thông tin bên ngoài phải có URL nguồn chính thức; không có ⇒ ghi "CHƯA KIỂM CHỨNG".
6. Code phải khớp `spec/02` (kiểu, API, mã lỗi, `CONFIG`), không tự đặt tên hay con số. AI không tự commit, không push; người kiểm xong mới commit, commit nhỏ như luật thi.
7. Viết tiếng Việt, sơ đồ Mermaid, đường dẫn tương đối. File spec ≤ 40 000 byte (riêng `spec/00` ≤ 45 000, `spec/02` ≤ 48 000, `spec/04` ≤ 42 000, `spec/10` ≤ 44 000, `spec/11` ≤ 46 000, `spec/20` ≤ 56 000, `spec/21` ≤ 45 000, `spec/30` ≤ 45 000).

## Làm phiếu
Người dùng nhắn `Làm phiếu <mã>`, `Làm tiếp`, `Kiểm phiếu <mã>` ⇒ làm theo `docs/quy-trinh-code-21h/lam-phieu.md`.

## Cần X ⇒ đọc
| Cần | Đọc |
| :-- | :-- |
| Hằng số, kiểu, mã lỗi | `spec/02` Mục 1, 2–8, 9 |
| Bảng DB, endpoint | `spec/03` Mục 2, 3 |
| Luồng đầu–cuối | `spec/01` Mục 5 |
| Quyết định đang áp dụng / chờ | `spec/00` |
