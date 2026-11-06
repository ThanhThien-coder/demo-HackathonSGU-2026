# D05 — Phân tích AI, Tổng quan

Làm xong phiếu này, cột phải có tab X-Ray giải thích luồng chạy của bài học và điểm dở do AI nhận định (không lộ cách sửa), cột giữa có bảng dưới, và cửa sổ Tổng quan repo đủ 3 giai đoạn.

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 17:30–18:30 (H+5.5 → H+6.5) |
| Nhánh | `d/D05-phan-tich` |
| Cần có trước | D04, E02 (fixture AI) |
| Mở đường cho | D06 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

**Cách nhanh:** nhắn AI `Làm phiếu D05`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D05-phan-tich
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D05 — Phân tích AI, Tổng quan". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: D04, E02 (fixture AI). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/30_UI.md` Mục 2.2, 6, 6.1, 6.3
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 6: T23, T33, T34, T36, T39
- `docs/spec/01_KIEN_TRUC_VA_LUONG.md` Mục 2
- `docs/spec/02_CONTRACTS.md` Mục 1, 5, 6, 10
- `docs/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md` Mục 1.1, 4
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 2.1
- `docs/spec/00_QUYET_DINH.md` D-35, D-71, D-78
- `package.json`
- `src/`

## Được ghi
- `src/components/learn/LearnSidePanel.tsx`
- `src/components/learn/XRayPanel.tsx`
- `src/components/learn/ProblemsPanel.tsx`
- `src/components/learn/RepoOverviewModal.tsx`
- `src/lib/graph.ts`
- `src/lib/__tests__/graph.test.ts`
- `src/app/dev/page.tsx`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết cột phải `src/components/learn/LearnSidePanel.tsx` có 2 tab X-Ray / Feynman theo `active_tab`; tab Feynman tắt kèm tooltip theo `docs/spec/30_UI.md` Mục 6, nội dung thêm ở D07. Viết `src/components/learn/XRayPanel.tsx` hiển thị giải thích luồng chạy theo từng bước, danh sách kỹ năng, điểm hay và điểm dở. Gắn tiêu đề "Điểm dở — Nhận định của AI", tuyệt đối không hiện cách sửa hay con số tình huống (INV-06, T23). Văn bản AI là chữ thuần, chỉ cho phép định dạng khối mã nội dòng trong ký tự backtick.
3. Viết `SkillChips` trong `XRayPanel.tsx` thể hiện chip kỹ năng có mài mòn chỉ hiển thị (`docs/spec/30_UI.md` Mục 6.1, BKT-24, D-35) kèm nhãn "đang mài mòn" khi decay, và nút ghim ở đáy cột "Bắt đầu trả lời (n) →" (UI-47): chưa có run thì không có số.
4. Viết cửa sổ Tổng quan `src/components/learn/RepoOverviewModal.tsx` đủ 3 giai đoạn theo D-71: (1) Lúc đầu tính facts từ `result`; (2) Trong lúc học gom từ các bản phân tích đã có; (3) Học hết mới hiện nhận định của AI (T33, T34). Viết `mainPath` chạy trên client trong `src/lib/graph.ts`, kèm test `src/lib/__tests__/graph.test.ts`, đúng thuật toán ENG-155 của `docs/spec/11_ENGINE_DO_THI.md`. Mở từ nút "Tổng quan kiến trúc" ở thanh trên, đóng bằng ✕, `Esc`, bấm nền hoặc bấm chip node.
5. Viết bảng dưới `src/components/learn/ProblemsPanel.tsx` theo `docs/spec/30_UI.md` Mục 2.2: mặc định ẩn, tab "Điểm dở — Nhận định của AI" và "Luồng", bấm dòng ⇒ `active_step`, không hiện cách sửa (T39).
6. Cập nhật trang nháp `src/app/dev/page.tsx` nạp fixture AI N3 từ `src/server/ai/__fixtures__/` của Vai E để hiển thị và kiểm tra.
7. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.


**Bắt buộc theo bản chạy thử** (chi tiết lỗi ở `docs/quy-trinh-code-21h/loi-can-sua.md`):
- **Tên tầng (lỗi D-06):** hiện tiếng Việt theo `30` Mục 6.3, không hiện `ENTRY_POINT`, `BUSINESS_LOGIC`.
- **Nhãn (lỗi D-03):** dùng "Lộ trình học chính", không dùng "Luồng chính".
- **Thư viện (lỗi B-09):** Tổng quan lọc đồ dev như `@types/*`, `ts-node` lúc hiển thị. Không đổi `fingerprint.tech_stack`.
- **Backtick (lỗi D-08):** chữ AI có `` ` `` hiện dạng code, không in nguyên dấu.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npm run build`
- Điểm dở gắn nhãn "Điểm dở — Nhận định của AI", không hiện cách sửa hay con số tình huống (INV-06, T23).
- Chip kỹ năng có nhãn "đang mài mòn" khi bị decay (D-35). Nút "Bắt đầu trả lời (n) →" ghim ở đáy cột (UI-47).
- Cửa sổ Tổng quan hiển thị đúng 3 giai đoạn theo D-71 (T33, T34).
- `mainPath` ở `src/lib/graph.ts` cho cùng kết quả ca T-ENG-35 của `docs/spec/11_ENGINE_DO_THI.md`.
- Bảng dưới mặc định ẩn, không có cách sửa (T39).

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/server/`, `src/app/api/`, `src/app/auth/`, `src/contracts/*`.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không commit file làm việc của agent (`.agents/`, prompt nháp) và ảnh không dùng.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D05 — Phân tích AI, Tổng quan" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npm run build` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Người chạy tay: mở `/dev`, chọn N3 thấy phân tích X-Ray nạp dữ liệu từ fixture `docs/spec/50_TEST_VA_FIXTURE.md` Mục 2.1.
- [ ] Phần Điểm dở có tiêu đề "Điểm dở — Nhận định của AI" và không để lộ cách sửa hay con số tình huống (INV-06, T23).
- [ ] Cửa sổ Tổng quan hiển thị đủ 3 giai đoạn theo D-71 (T33, T34).
- [ ] Ở 1366×768, cửa sổ Tổng quan thấy đủ tiêu đề và nút, thân cuộn được, tên tầng tiếng Việt (T36).
- [ ] Bảng dưới có 2 tab, bấm dòng thì code cuộn tới bước, không có cách sửa (T39).

```text
Task "D05 — Phân tích AI, Tổng quan" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/lib/graph.ts src/lib/__tests__/graph.test.ts
git commit -m "feat(ui): mainPath trên client"
git add src/components/learn/LearnSidePanel.tsx src/components/learn/XRayPanel.tsx
git commit -m "feat(ui): cột phải và tab X-Ray"
git add src/components/learn/ProblemsPanel.tsx
git commit -m "feat(ui): bảng dưới điểm dở và luồng"
git add src/components/learn/RepoOverviewModal.tsx src/app/dev/page.tsx
git commit -m "feat(ui): cửa sổ tổng quan repo và trang nháp fixture N3"
git pull --rebase origin main
git push -u origin d/D05-phan-tich
gh pr create --base main --title "D05 — Phân tích AI, Tổng quan" --body "Closes #<số Issue>"
```

Báo Vai A review và merge. Vai A merge khi CI xanh.

## Tiếp theo

→ [D06](D06-noi-api.md)
