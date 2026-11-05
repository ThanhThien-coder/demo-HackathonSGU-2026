# A01 — Khung code repo thi

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 12:00–12:30 (H+0 → H+0.5) |
| Nhánh | `main` |
| Cần có trước | Bước 0 trong `docs/doc-de-hieu/01_deploy.md` Mục 3 |
| Mở đường cho | mọi task |
| Cách làm | Claude tự chạy lệnh (create-next-app, npm install) · bạn kiểm và push main |

**Cách nhanh:** nhắn AI `Làm phiếu A01`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git status
```

Repo ban đầu còn trống nên bạn không cần chạy `git pull` hay `npm ci`. Trước khi bắt đầu, chạy lệnh `git status` và xác nhận rằng `.kb`, `.env*`, `AGENTS.md`, `CLAUDE.md` không hiển thị trong danh sách theo dõi (đã được cấu hình trong `.git/info/exclude` theo `docs/doc-de-hieu/01_deploy.md` Mục 3.9).

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "A01 — Khung code repo thi". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: Bước 0 trong `docs/doc-de-hieu/01_deploy.md` Mục 3. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 15, 16, 17
- `docs/spec/03_API_VA_LUU_TRU.md` Mục 6.8, 8
- `docs/spec/00_QUYET_DINH.md` D-27, D-45, D-49, D-64

## Được ghi
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `next.config.ts`
- `postcss.config.mjs`
- `eslint.config.mjs`
- `vitest.config.ts`
- `.gitignore`
- `.env.example`
- `README.md`
- `LICENSE`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/app/api/health/route.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Khởi tạo Next.js 15: chạy lệnh `npx create-next-app@15 . --ts --app --tailwind --eslint --src-dir --import-alias "@/*" --use-npm`. Nếu lệnh báo thư mục không trống do có thư mục `.kb`, tạo ở thư mục tạm rồi chép sang, không chép thư mục `.git`.
3. Cài đặt các gói thư viện theo `docs/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 16 với cờ `--save-exact`, bổ sung gói `monaco-editor`, cấu hình `tsconfig.json` với `strict: true`, thêm `vitest.config.ts`, thêm các script `test`, `typecheck`, `lint` vào `package.json`.
4. Cấu hình `.gitignore` có `.env*` và `!.env.example`. Tạo file `.env.example` chỉ có tên các biến môi trường của `docs/spec/03_API_VA_LUU_TRU.md` Mục 8 (không ghi giá trị). Tạo `README.md` có mục "Tự cài đặt" theo D-45. Tạo file `LICENSE` MIT theo D-49.
5. Cấu hình 4 headers bảo mật trong `next.config.ts` theo `docs/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 17 ý 5 (không đặt CSP), cấu hình `outputFileTracingIncludes` theo `docs/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 16; tạo route `src/app/api/health/route.ts` trả HTTP 200 text/plain `ok`, không gọi database theo `docs/spec/03_API_VA_LUU_TRU.md` Mục 6.8.

## Tiêu chí xong
- Lệnh kiểm: `npm run build && npx tsc --noEmit && npx vitest run --passWithNoTests`
- Lệnh `curl -i localhost:3000/api/health` trả HTTP 200 text/plain `ok`.
- Lệnh `git status` không thấy `.kb`, `.env.local`, `AGENTS.md`, `CLAUDE.md`.
- Trong `package.json` không có phiên bản nào mang ký tự `latest`, `^`, `~`.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không tạo trước code hay thư mục giữ chỗ cho vai khác.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Không giao agy cho task "A01 — Khung code repo thi" vì cần chạy lệnh. Bạn tự làm đúng mục Việc cần làm của task, rồi tự kiểm theo Tiêu chí xong. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push. Báo lại: các lệnh đã chạy và kết quả (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa.
```

Rồi mở **chat Claude mới** và dán:

```text
Dùng skill kiem-task kiểm task "A01 — Khung code repo thi": chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push. Chỉ báo lại kết quả.
```

Claude chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, làm tiếp từng nhóm commit ở Bước 4.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npm run build && npx tsc --noEmit && npx vitest run --passWithNoTests` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Chạy `npm run dev` ở cửa sổ khác rồi `curl -i localhost:3000/api/health` trả về mã 200 kèm nội dung `ok`.
- [ ] Lệnh `git status` không hiển thị `.kb`, `.env.local`, `AGENTS.md`, `CLAUDE.md`.
- [ ] Mở file `package.json`, các phiên bản thư viện đều được ghim cố định, không có ký tự `latest`, `^`, `~`.

```text
Task "A01 — Khung code repo thi" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add .gitignore .env.example README.md LICENSE
git commit -m "chore(setup): env mẫu, README, LICENSE"
git add next.config.ts src/app/api/health/route.ts
git commit -m "chore(setup): headers bảo mật, healthcheck"
git add vitest.config.ts tsconfig.json
git commit -m "chore(setup): cấu hình TypeScript strict, vitest"
git status
# xem không có .kb, .env*, AGENTS.md, CLAUDE.md mới đi tiếp
git add .
git commit -m "chore(setup): khởi tạo Next.js 15, cài thư viện chốt phiên bản"
git push -u origin main
```

Lần này push thẳng `main`, không tạo PR. Sau khi push, nhắn cả nhóm `git pull` để lấy khung code. Báo phiên bản `web-tree-sitter` cho Vai B (D-32).

## Tiếp theo

→ [A02](A02-contracts.md)
