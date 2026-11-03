# B01 — Thử 3 giả định tải repo, nạp grammar

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 12:00–13:00 (H+0 → H+1) · **Mốc H+1** |
| Nhánh | `b/B01-grammar` |
| Cần có trước | Bước 1 cần A01 (khung code trên main); bước 3 cần A02 (kiểu `LanguageAdapter`, `LanguageId`, `LanguageSupportTier` trong `src/contracts`; trong lúc chờ thì vẫn viết, PR merge sau A02) |
| Mở đường cho | B05 |
| Cách làm | bạn thử curl ở Bước 0 · Claude nạp grammar ở Bước 2 · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

1. **12:00–12:30, chưa cần khung code:** dùng `curl` thử 3 giả định ⚠️ của `docs/spec/10_ENGINE_INGEST.md` trên repo demo Q-03 (codeload trả đúng mã cho `HEAD`; `archive/HEAD.zip` chuyển hướng tới nhánh mặc định; comment EOCD có commit SHA), đăng kết quả lên Issue chung.
2. **Khi Vai A báo khung code (A01) đã lên `main`:**

```powershell
git checkout main; git pull; npm ci; git checkout -b b/B01-grammar
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "B01 — Thử 3 giả định tải repo, nạp grammar". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: Bước 1 cần A01 (khung code trên main); bước 3 cần A02 (kiểu `LanguageAdapter`, `LanguageId`, `LanguageSupportTier` trong `src/contracts`; trong lúc chờ thì vẫn viết, PR merge sau A02). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/10_ENGINE_INGEST.md` Mục 2, 3, 5
- `docs/spec/11_ENGINE_DO_THI.md` Mục 1, Test bắt buộc
- `docs/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 16
- `docs/spec/02_CONTRACTS.md` Mục 2 (`LanguageId`, `LanguageSupportTier`), Mục 4 (`LanguageAdapter`)
- `docs/spec/00_QUYET_DINH.md` D-32, Q-03
- `package.json`
- `public/grammars/`
- `src/`

## Được ghi
- `public/grammars/`
- `src/server/engine/graph/registry.ts`
- `src/server/engine/graph/parser.ts`
- `src/server/engine/graph/__tests__/parser.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Thu thập grammar `.wasm` của TypeScript, TSX, JavaScript, Python cùng ABI với `web-tree-sitter` đã chốt trong `package.json` theo `docs/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 16; đặt vào thư mục `public/grammars/`.
3. Viết `registry.ts` (`LANGUAGE_REGISTRY` chỉ gồm 4 ngôn ngữ có grammar ở bước 2, `KNOWN_NO_GRAMMAR` đủ đuôi) và `parser.ts` có hàm `initParsers()` nạp các grammar theo `docs/spec/11_ENGINE_DO_THI.md` Mục 1 (ENG-11). Kiểu `LanguageAdapter`, `LanguageId`, `LanguageSupportTier` chỉ `import type` từ `@/contracts`, không tự khai báo lại. Chưa viết `parseAll` (ENG-12, thuộc B05).
4. Viết test `src/server/engine/graph/__tests__/parser.test.ts` kiểm tra nạp thành công grammar TS/JS và Python; test tên bắt đầu bằng `ENG-11`.
5. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/engine/graph/__tests__/parser.test.ts`
- Test tên bắt đầu bằng `ENG-11` nạp được TS/JS và Python.
- Các file grammar `.wasm` tồn tại trong thư mục `public/grammars/` và cùng ABI với `web-tree-sitter`.
- Lệch ABI ⇒ làm theo D-32 (đổi bản `web-tree-sitter`, không tự build grammar), báo Vai A sửa `package.json`.
- `npx tsc --noEmit` không lỗi. A02 chưa merge thì lỗi duy nhất được phép là `Cannot find module '@/contracts'`; ghi rõ vào báo cáo, không đổi sang `kẹt`.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Không giao agy cho task "B01 — Thử 3 giả định tải repo, nạp grammar" vì cần chạy lệnh. Bạn tự làm đúng mục Việc cần làm của task, rồi tự kiểm theo Tiêu chí xong. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push. Báo lại: các lệnh đã chạy và kết quả (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa.
```

Rồi mở **chat Claude mới** và dán:

```text
Dùng skill kiem-task kiểm task "B01 — Thử 3 giả định tải repo, nạp grammar": chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push. Chỉ báo lại kết quả.
```

Claude chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, làm tiếp từng nhóm commit ở Bước 4.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/engine/graph/__tests__/parser.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Test tên bắt đầu bằng `ENG-11` nạp được TS/JS và Python.
- [ ] Lệch ABI ⇒ làm theo D-32 (đổi bản `web-tree-sitter`, không tự build grammar), báo Vai A sửa `package.json`.
- [ ] `npx tsc --noEmit` xanh. Còn lỗi `Cannot find module '@/contracts'` nghĩa là A02 chưa merge: vẫn commit, nhưng chỉ mở PR sau khi A02 lên `main` (rebase rồi chạy lại `tsc`).

```text
Task "B01 — Thử 3 giả định tải repo, nạp grammar" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add public/grammars/ src/server/engine/graph/registry.ts src/server/engine/graph/parser.ts src/server/engine/graph/__tests__/parser.test.ts
git commit -m "feat(engine): nạp grammar Tree-sitter"
git pull --rebase origin main
git push -u origin b/B01-grammar
gh pr create --base main --title "B01 — Thử 3 giả định tải repo, nạp grammar" --body "Closes #<số Issue>"
```

Việc của người: đăng kết quả 3 giả định; EOCD không có SHA thì báo Vai A và Vai C (dùng `ARCHIVE_HASH`). Chỉ chạy `gh pr create` khi A02 đã merge (CI chạy `tsc`, thiếu `src/contracts` sẽ đỏ). Vai A merge khi CI xanh.

## Tiếp theo

→ [B02](B02-ingest-tai.md)
