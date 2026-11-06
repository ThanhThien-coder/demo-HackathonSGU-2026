# Chia việc giao diện tối 06/11/2026

Mục tiêu tối nay: đưa giao diện về quy trình học mới (`prototype.html`, D-81 … D-84) rồi test chéo. Bốn người làm: Thiện, Phat107, Minh, Huynh Nhan. Mỗi thẻ đã có hướng dẫn chi tiết ở `vai-D/D11` … `D19`. File này chỉ chia ai làm thẻ nào, sửa file nào, chờ ai, và test thế nào.

## 1. Nền làm việc

- **Làm trên `main`.** Pull `main` mới trước khi tách nhánh. UI cũ trên `main` vẫn chạy được, và store đã gọi tổng quan đầu phiên (C-12).
- **Không dựa nhánh `new-ui`.** Nhánh đó xóa hết trang, chưa dựng trang mới. Theme màu mới lấy từ `prototype.html`, áp sau cùng nếu còn giờ.
- Mỗi thẻ 1 nhánh `d/<mã-thẻ>-<tên-ngắn>`, commit nhỏ, mở PR ngay khi chạy được.
- Trước khi mở PR: `npm run typecheck`, `npm run lint`, `npm test` phải xanh. Rồi tự chạy phần "Kiểm tra" của thẻ trên trình duyệt.

## 2. Chia việc

| Người | Thẻ, làm theo thứ tự | File được sửa | Chờ ai | Mở PR trước |
| :-- | :-- | :-- | :-- | :-- |
| **Thiện** | [D11](vai-D/D11-tab-file.md) tab file ⇒ [D14](vai-D/D14-to-dung-dong.md) tô đúng dòng ⇒ [D15](vai-D/D15-goi-y-tour.md) gợi ý trỏ về tour, ẩn câu `DROPPED`. Việc thêm: chạy migration `0002_explain_selection.sql` lên Supabase | `src/components/code/*`, `src/app/learn/components/CodeSnippetViewer.tsx`, `FullFileModal.tsx`, `FeynmanQuestionSection.tsx`, `RunSummary.tsx` | Không | D11: 22:15 · D15: 23:15 |
| **Phat107** | [D12](vai-D/D12-tour.md) X-Ray dạng tour ⇒ [D13](vai-D/D13-the-khai-niem.md) thẻ khái niệm | `XRayPanel.tsx`, `SkillChips.tsx`, `src/lib/concept-cards.ts` (mới) | D11 (bấm bước thì mở đúng tab file); trong lúc chờ, làm tour với khung code hiện có | D12: 22:30 · D13: 23:15 |
| **Minh** | B-40 nhóm, thực thể (nếu chưa xong) ⇒ [D17](vai-D/D17-ban-do-nhom.md) bản đồ chia nhóm | `src/server/engine/*` (B-40), `LessonGraphDrawer.tsx`, `GraphSidebarButton.tsx` | Không | B-40: 22:15 · D17: 23:15 |
| **Huynh Nhan** | [D18](vai-D/D18-tong-quan.md) tổng quan 2 nhịp ⇒ [D16](vai-D/D16-the-vai-tro.md) thẻ vai trò ⇒ [D19](vai-D/D19-popover-doan-chon.md) popover giải thích đoạn chọn | `RepoOverviewModal.tsx`, `RoleCard.tsx` (mới), `SelectionPopover.tsx` (mới), `src/lib/api.ts` (chỉ thêm hàm `explainSelection`) | D17 cho phần nhóm của D18; D11 cho sự kiện bôi đen của D19 | D18: 22:30 · D16: 23:00 · D19: 23:30 |

**File dùng chung:**
- **`src/store/workbench.ts`:** Phat107 (bước tour), Thiện (D15 nhảy về bước) và Huynh Nhan (cache giải thích) đều cần sửa. Mỗi người thêm khối riêng, có chú thích mã thẻ. Pull ngay trước khi sửa, commit ngay sau khi sửa, không sửa khối của người khác.
- **`src/app/learn/page.tsx`:** chỉ gắn component vào trang, mỗi lần 1–2 dòng. Ai gắn thì báo nhóm.

## 3. Thỏa thuận giữa các thẻ

Chốt tên trước khi code để không phải chờ nhau. Người cung cấp viết đúng chữ ký này; người dùng viết với dữ liệu giả trước.

| Người cung cấp ⇒ người dùng | Thỏa thuận |
| :-- | :-- |
| Thiện ⇒ Phat107 | Khung code nhận `activeStep: number` và tự mở tab file của bước đó, tô đoạn của bước |
| Thiện ⇒ Huynh Nhan | Khung code gọi `onSelect({ step_number, range: { line_start, col_start, line_end, col_end }, selected_text, rect })` khi bôi đen. Dòng là **số dòng gốc** (đổi qua `snippet_line_map`), cột tính từ 1, `col_end` không tính. Bỏ chọn ⇒ `onSelect(null)` |
| Phat107 ⇒ Thiện | Store có `active_step` và hàm `goToStep(n)`; gợi ý `CODE_POINTER` của D15 gọi hàm này để mở lại bước trong tour |
| Phat107 ⇒ Huynh Nhan | Tour có bước 0 là chỗ đặt `<RoleCard node={…} />` |
| Minh ⇒ Huynh Nhan | Engine trả `graph.groups` `{ group_id, key, key_kind, node_ids }` và `node.group_id`. Chưa có B-40 thì UI dùng nhóm dự phòng theo đầu route (D-21, phần tất định) |

Dữ liệu AI cho D16, D18, D19 đã có trên `main`:
- `overview.ai`: `summary`, `groups[{group_id, name}]`, `node_titles[{node_id, title}]`.
- Câu 1 của `analysis.architecture.summary` là dòng "Vai trò".
- `POST /api/explain-selection` trả `explanation {kind, what, here, analogy, skill} | null` và `references`. Lỗi: `ERR_SELECTION_INVALID` (400), `ERR_EXPLAIN_LIMIT` (429).

## 4. Mốc giờ

| Giờ | Việc |
| :-- | :-- |
| 21:30 | Pull `main`, tách nhánh, chốt thỏa thuận Mục 3 trong nhóm chat |
| 22:15 – 22:30 | Mốc 1: D11, B-40, D12, D18 có PR. Thiện merge D11 trước vì 2 thẻ chờ nó |
| 23:15 – 23:30 | Mốc 2: mọi thẻ có PR. **23:30 đóng băng**, chỉ sửa lỗi |
| 23:30 – 00:30 | Test chéo theo Mục 5 |
| 00:30 | Sửa lỗi nặng, merge, chạy lại kịch bản 1 lần trên `main` |

**Nếu trễ thì bỏ theo thứ tự:** D19 ⇒ dòng "Dữ liệu" của D16 ⇒ nhóm thật của D17 (dùng nhóm dự phòng) ⇒ theme màu mới.

**Thứ tự merge:** D11 ⇒ D14 ⇒ D12 ⇒ B-40 ⇒ D17 ⇒ D18 ⇒ D16 ⇒ D13 ⇒ D15 ⇒ D19. Người khác thẻ duyệt PR trước khi merge.

## 5. Test chéo tối nay

Người test không phải người code. Mỗi người chạy `npm run dev`, đăng nhập, dán BrewLite (`https://github.com/kuuhakubee/CNPM_BrewLite`, thư mục `apps/api`), rồi đi theo bảng. Lỗi ghi vào `docs/quy-trinh-code-21h/loi-can-sua.md` theo mẫu có sẵn, kèm ảnh chụp.

| Người test | Test thẻ của | Kiểm |
| :-- | :-- | :-- |
| Minh | Thiện | Bài 3 file hiện 3 tab; bấm bước mở đúng tab; bấm điểm dở cuộn và tô đúng dòng; câu `DROPPED` không hiện ô ⊘, đếm `Câu k/n` đúng; gợi ý `CODE_POINTER` mở lại đúng bước |
| Thiện | Phat107 | Đi hết tour "Xem danh sách sản phẩm" như `prototype.html`: thẻ vai trò ⇒ từng bước, ← → chạy, chip kỹ năng ⇒ thẻ khái niệm, Esc đóng ⇒ tóm tắt ⇒ nút sang Feynman |
| Huynh Nhan | Minh | Bản đồ chia nhóm; tên AI có nhãn "AI đặt tên", tên code ở dòng nhỏ; bài khóa không mở được |
| Phat107 | Huynh Nhan | Tổng quan hiện ngay phần tất định, phần AI hiện sau; đặt `AI_DISABLED=true` vẫn có nhóm và câu dự phòng; thẻ vai trò đủ 4 dòng; bôi đen `await` ra giải thích, bôi lại chỗ đó hiện liền không gửi request |

Cuối buổi, cả nhóm chạy chung 1 lượt: học trọn 1 bài từ tổng quan tới chốt xanh hoặc đỏ. Câu 1 phải là câu `FLOW`.

## 6. Câu dán cho AI của từng người

```text
Tôi là <tên>. Pull main mới. Đọc docs/quy-trinh-code-21h/chia-viec-giao-dien-toi-0611.md: Mục 1, Mục 3 và đúng dòng của tôi ở Mục 2. Rồi đọc thẻ docs/quy-trinh-code-21h/vai-D/<Dxx>.md và làm theo "Quy trình cho agent" trong docs/quy-trinh-code-21h/loi-can-sua.md. Chỉ sửa file ở cột "File được sửa" của tôi; file dùng chung làm theo luật Mục 2. Xong thì chạy typecheck, lint, test, tự kiểm phần "Kiểm tra" của thẻ, rồi báo tôi trước khi commit.
```
