# SimpliFey V2 Pro — Codebase Cognitive Twin

> Hackathon SGU 2026–2027 · Repo **code tập dượt**: copy từ repo tài liệu cũ để code thử 21 giờ trước vòng thi thật (vòng 2: 7–8/11/2026, giả định 12g00 07/11 → 09g00 08/11; vòng 3: 09/11/2026). Code nằm ở `src/`, tài liệu (đặc tả, thuyết trình) nằm ở `docs/`.

**Sản phẩm:** dán link repo GitHub (hoặc kéo thả `.zip`) ⇒ trong < 1.5 s có bản đồ tối đa 20 node. Mỗi node là một lát cắt nghiệp vụ xuyên file, dựng bằng code thuần, 0 token. Sau đó AI làm 3 việc:
- phân tích điểm hay / điểm dở của từng node;
- đặt câu hỏi Feynman cho đúng kỹ năng người học còn yếu;
- chấm bài và gợi ý 3 nấc.

Mô hình BKT ghi nhận năng lực kỹ năng: luôn hỏi ít nhất 1 câu cho kỹ năng yếu nhất của node (không có miễn thi, D-34), và hiển thị mài mòn kỹ năng theo thời gian thay vì bắt ôn tập (D-35).

**Định hướng:** Dự án mã nguồn mở cho cộng đồng (tự clone, tự điền API key trong `.env`) kết hợp nghiên cứu học thuật và CV; bản nhóm host là bản dùng thử có giới hạn cho repo công khai (D-33).

**Trạng thái:** Quyết định và câu hỏi còn mở nằm ở [`spec/00_QUYET_DINH.md`](docs/spec/00_QUYET_DINH.md).

---

## Đọc theo thứ tự nào

| Ai | Đọc |
| :-- | :-- |
| **Cả nhóm (bắt buộc)** | [`00_QUYET_DINH`](docs/spec/00_QUYET_DINH.md) → [`01_KIEN_TRUC_VA_LUONG`](docs/spec/01_KIEN_TRUC_VA_LUONG.md) → [`02_CONTRACTS`](docs/spec/02_CONTRACTS.md) → [`03_API_VA_LUU_TRU`](docs/spec/03_API_VA_LUU_TRU.md) → [`04_KIEN_TRUC_TRIEN_KHAI`](docs/spec/04_KIEN_TRUC_TRIEN_KHAI.md) |
| **Vai A — Trưởng tích hợp** | + [`50_TEST_VA_FIXTURE`](docs/spec/50_TEST_VA_FIXTURE.md) |
| **Vai B — Engine** | + [`10_ENGINE_INGEST`](docs/spec/10_ENGINE_INGEST.md), [`11_ENGINE_DO_THI`](docs/spec/11_ENGINE_DO_THI.md), [`12_ENGINE_MAU_ENTRY`](docs/spec/12_ENGINE_MAU_ENTRY.md) |
| **Vai C — AI + BKT** | + [`20_AI_GOI_VA_PROMPT`](docs/spec/20_AI_GOI_VA_PROMPT.md), [`21_AI_KIEM_VA_DUYET`](docs/spec/21_AI_KIEM_VA_DUYET.md), [`22_BKT_VA_KE_HOACH_CAU_HOI`](docs/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md) |
| **Vai D — Giao diện** | + [`30_UI`](docs/spec/30_UI.md) |
| **Vai E — Kiểm thử & Demo** | + [`50_TEST_VA_FIXTURE`](docs/spec/50_TEST_VA_FIXTURE.md) |
| **Thuyết trình / người mới** | [`doc-de-hieu/00_toan_canh`](docs/doc-de-hieu/00_toan_canh.md) → [`pitch/KICH_BAN_DEMO`](docs/pitch/KICH_BAN_DEMO.md) → [`pitch/PHAN_BIEN_BGK`](docs/pitch/PHAN_BIEN_BGK.md) |
| **Tài liệu dễ hiểu / triển khai** | [`doc-de-hieu/01_deploy`](docs/doc-de-hieu/01_deploy.md) (dựng và deploy) → [`doc-de-hieu/07_ke_hoach_21h`](docs/doc-de-hieu/07_ke_hoach_21h.md) (kế hoạch 21 giờ) |
| **Trợ lý AI khi code** | `CLAUDE.md` + đúng các file của module đang làm (mỗi file ≤ ~40 KB, đọc trọn) |

## Thư mục

| Thư mục | Nội dung | Có phải nguồn chuẩn? |
| :-- | :-- | :-- |
| `spec/` | Đặc tả để code: quyết định, kiến trúc, contract + `CONFIG`, API/DB, engine, AI, BKT, UI, test | **Có — nguồn duy nhất** |
| `pitch/` | Kịch bản demo, phản biện BGK, roadmap sau cuộc thi | Không (lệch thì `spec/` đúng) |
| `doc-de-hieu/` | Bản giải thích cho người đọc, hướng dẫn dựng hệ thống, kế hoạch 21 giờ | Không, riêng lịch 21 giờ thì `07_ke_hoach_21h.md` là nơi gốc |
| `references/` | Thể lệ cuộc thi (`thele.md`), giáo trình thuật toán minh họa | Thể lệ là ràng buộc ngoài |
| `archive/` | Tài liệu cũ, gồm toàn bộ bản trước hợp nhất (`2026-10-28_truoc-hop-nhat/`) và mẫu giao diện cũ (`prototype/`) | Không |

## Luật giữ tài liệu không rối lại

1. **Mỗi sự thật chỉ ở một chỗ.**
   - Kiểu dữ liệu và hằng số nằm ở `spec/02_CONTRACTS.md`.
   - Nơi khác chỉ nhắc tên: `CONFIG.X`, tên type, mã luật (`ENG-12`, `BKT-03`…).
2. **Đổi quyết định** ⇒ sửa dòng D-xx trong `00_QUYET_DINH.md` trước, rồi mới sửa file đích.
3. **Không viết thêm file tổng hợp mới vào `spec/`.**
   - Bản dễ hiểu đặt ở `doc-de-hieu/`.
   - Lịch sử đặt ở `archive/`.
4. **Số liệu độ trễ / token / chi phí là mục tiêu** cho tới khi đo trên code thật.

## Tự cài đặt

Cần Node.js 20 trở lên và npm.

```bash
git clone <url-repo-này>
cd <thư-mục-repo>
npm ci
cp .env.example .env.local   # rồi điền giá trị các biến
npm run dev
```

Mở http://localhost:3000. Kiểm tra server sống: `curl -i http://localhost:3000/api/health` trả `200 ok`.

Lệnh kiểm: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`.

Giấy phép: MIT, xem [LICENSE](LICENSE).
